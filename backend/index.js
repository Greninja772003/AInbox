import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import FileStore from "session-file-store";
import path from "path";
import { fileURLToPath } from "url";
import {
  classfying_with_fallback,
  summarizeAndReplyWithFallback,
} from "./agents/agent_api.js";
import sessionCache from "./utils/sessionCache.js";
import cacheCleanupMiddleware from "./utils/cacheMiddleware.js";
import emailWritingController from "./controllers/emailWritingController.js";
// import { DataProvider } from "./utils/dataProvider.js"
// import { config } from "./utils/config.js"
// Add these imports at the top of your file
import { logRoutes, testRouteMatching } from "./debug-helper.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const FileSessionStore = FileStore(session);

// ----------------------------- Cache Keys -----------------------------
const CACHE_KEYS = {
  EMAIL_LIST: "emails",
  EMAIL_DETAIL: "email_detail_",
  CALENDAR_EVENTS: "calendar_events",
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  EMAIL_LIST: 5 * 60 * 1000, // 5 minutes
  EMAIL_DETAIL: 10 * 60 * 1000, // 10 minutes
  CALENDAR_EVENTS: 15 * 60 * 1000, // 15 minutes
};

// ----------------------------- OAuth Client Initialization -----------------------------
let oAuth2Client;

function initializeOAuth() {
  oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URIS
  );
  return oAuth2Client;
}
console.log(oAuth2Client);
// Initialize OAuth client
initializeOAuth();

// ----------------------------- Middleware -----------------------------
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true,
  })
);

app.use(
  session({
    store: new FileSessionStore({
      path: path.join(__dirname, "../sessions"),
      retries: 1,
      ttl: 7 * 24 * 60 * 60, // 7 days in seconds
    }),
    secret: process.env.SESSION_SECRET || "email-assistant-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh session expiry on every request
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // Set to true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Add cache cleanup middleware
app.use(
  cacheCleanupMiddleware({
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  })
);

// ----------------------------- Auth Middleware -----------------------------
async function ensureValidToken(req, res, next) {
  if (!req.session?.tokens) {
    console.log("No tokens found in session");
    return res.status(401).json({ error: "Not logged in" });
  }

  // Check if token is expired
  const expiryDate = req.session.tokens.expiry_date;
  if (expiryDate && expiryDate <= Date.now()) {
    try {
      console.log("Token expired, attempting to refresh");
      oAuth2Client.setCredentials(req.session.tokens);
      const { credentials } = await oAuth2Client.refreshAccessToken();
      req.session.tokens = credentials;
      console.log("Token refreshed successfully");
    } catch (err) {
      console.error("Failed to refresh token:", err);
      // Clear the invalid session
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Error destroying invalid session:", destroyErr);
        }
      });
      return res
        .status(401)
        .json({ error: "Session expired, please login again" });
    }
  }

  // Attach session cache utilities to the request
  req.sessionCache = {
    get: (key) => sessionCache.get(req.sessionID, key),
    set: (key, value, expiration) =>
      sessionCache.set(req.sessionID, key, value, expiration),
    remove: (key) => sessionCache.remove(req.sessionID, key),
    clear: () => sessionCache.clearSession(req.sessionID),
  };

  next();
}

// ----------------------------- Helper Functions -----------------------------
function decodeBase64(encoded) {
  const cleaned = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(cleaned, "base64").toString("utf-8");
}

function extractEmailBody(payload) {
  if (payload.body?.data) return decodeBase64(payload.body.data);

  if (payload.parts) {
    const plain = payload.parts.find((p) => p.mimeType === "text/plain");
    if (plain?.body?.data) return decodeBase64(plain.body.data);

    const html = payload.parts.find((p) => p.mimeType === "text/html");
    if (html?.body?.data) return decodeBase64(html.body.data);
  }

  return "No body content found.";
}

// ----------------------------- Auth Routes -----------------------------
app.get("/auth/login", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "", // Always show consent screen to get refresh token
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });
  res.redirect(authUrl);
});

app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
    const userInfo = await oauth2.userinfo.get();

    req.session.tokens = tokens;
    req.session.email = userInfo.data.email;

    console.log("Authentication successful for:", userInfo.data.email);
    console.log("Token expiry:", new Date(tokens.expiry_date));

    res.redirect("http://localhost:8080/dashboard");
  } catch (err) {
    console.error("Auth callback error:", err);
    res.status(500).send("Authentication failed");
  }
});

app.get("/auth/status", (req, res) => {
  console.log("Session check:", {
    hasTokens: !!req.session?.tokens,
    hasEmail: !!req.session?.email,
    sessionID: req.sessionID,
  });

  if (req.session?.tokens && req.session?.email) {
    return res.json({ loggedIn: true, email: req.session.email });
  }
  res.status(401).json({ loggedIn: false });
});

app.get("/auth/logout", (req, res) => {
  // Clear the session cache before destroying the session
  if (req.sessionID) {
    sessionCache.clearSession(req.sessionID);
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ success: true });
  });
});

// ----------------------------- API Routes -----------------------------
// NOTE: Order matters! More specific routes must come before parameterized routes
// Get sent emails endpoint
app.get("/api/emails/sent", ensureValidToken, async (req, res) => {
  try {
    // Check cache first
    const cacheKey = `${CACHE_KEYS.EMAIL_LIST}_sent`;
    const cachedEmails = req.sessionCache.get(cacheKey);
    if (cachedEmails && !req.query.refresh) {
      console.log("📋 Cache hit for sent email list");
      return res.json(cachedEmails);
    }

    console.log("🔍 Cache miss for sent email list, fetching from Gmail...");

    // Verify token before proceeding
    if (!req.session?.tokens?.access_token) {
      console.error("Missing access token in session");
      return res
        .status(401)
        .json({ error: "Authentication required. Please login again." });
    }

    try {
      oAuth2Client.setCredentials(req.session.tokens);
      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

      console.log("Fetching sent message list from Gmail API...");
      const { data } = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10, // Reduce to 25 for better performance
        labelIds: ["SENT"],
      });

      const messages = data.messages || [];
      console.log(`Found ${messages.length} sent messages`);

      if (messages.length === 0) {
        // Return empty array if no messages found
        return res.json([]);
      }

      const emails = [];
      const fetchPromises = [];

      // Process emails in parallel for better performance
      for (const msg of messages) {
        fetchPromises.push(
          (async () => {
            try {
              // Check that message ID exists and is valid
              if (!msg.id || typeof msg.id !== "string") {
                console.error(`Invalid message ID: ${msg.id}`);
                return;
              }

              const { data: fullMsg } = await gmail.users.messages.get({
                userId: "me",
                id: msg.id, // Make sure we're using the message ID
                format: "full",
              });

              const headers = fullMsg.payload.headers;
              const subject =
                headers.find((h) => h.name === "Subject")?.value ||
                "No subject";
              const to =
                headers.find((h) => h.name === "To")?.value ||
                "Unknown recipient";
              const date =
                headers.find((h) => h.name === "Date")?.value || "Unknown date";

              emails.push({
                id: msg.id,
                subject,
                to,
                date,
                snippet: fullMsg.snippet,
              });
            } catch (err) {
              console.error(`Error processing sent message ${msg.id}:`, err);
              // Continue with other messages despite this error
            }
          })()
        );
      }

      await Promise.all(fetchPromises);
      console.log(`Successfully processed ${emails.length} sent emails`);

      // Sort emails by date (newest first)
      emails.sort((a, b) => {
        return (
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        );
      });

      // Cache the result
      req.sessionCache.set(cacheKey, emails, CACHE_EXPIRY.EMAIL_LIST);

      res.json(emails);
    } catch (err) {
      console.error("Gmail API error (sent emails):", err);

      if (err.code === 401 || err.response?.status === 401) {
        return res
          .status(401)
          .json({ error: "Authentication expired. Please login again." });
      }

      return res.status(500).json({
        error: "Failed to fetch sent emails",
        message: err.message || "Unknown error",
      });
    }
  } catch (err) {
    console.error("Error fetching sent emails:", err);
    res.status(500).json({
      error: "Failed to fetch sent emails",
      message: err.message || "Unknown error",
    });
  }
});

// Get sent email details - completely separate endpoint
app.get("/api/emails/sent/:id", ensureValidToken, async (req, res) => {
  const emailId = req.params.id;
  if (!emailId) return res.status(400).json({ error: "Missing email ID" });

  console.log(`REQUEST: Getting sent email with ID: ${emailId}`);

  try {
    // Validate emailId format
    if (!/^[a-zA-Z0-9-_]+$/.test(emailId)) {
      console.log(`Invalid email ID format: ${emailId}`);
      return res.status(400).json({ error: "Invalid email ID format" });
    }

    // Use a distinct cache key for sent emails
    const cacheKey = `${CACHE_KEYS.EMAIL_DETAIL}sent_${emailId}`;
    const cachedEmail = req.sessionCache.get(cacheKey);
    if (cachedEmail && !req.query.refresh) {
      console.log(`📋 Cache hit for sent email detail ${emailId}`);
      return res.json(cachedEmail);
    }

    console.log(
      `🔍 Cache miss for sent email detail ${emailId}, fetching from Gmail...`
    );

    // Verify token before proceeding
    if (!req.session?.tokens?.access_token) {
      console.error("Missing access token in session");
      return res
        .status(401)
        .json({ error: "Authentication required. Please login again." });
    }

    oAuth2Client.setCredentials(req.session.tokens);
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    console.log(`Fetching sent message ${emailId} details...`);

    // Try direct lookup first for better performance
    try {
      console.log(`Direct lookup for message ID: ${emailId}`);
      const { data: fullMsg } = await gmail.users.messages.get({
        userId: "me",
        id: emailId,
        format: "full",
      });

      // Check if this message has the SENT label
      const hasLabel = fullMsg.labelIds && fullMsg.labelIds.includes("SENT");
      if (!hasLabel) {
        console.warn(
          `Email ${emailId} found but not in SENT folder, labels: ${
            fullMsg.labelIds?.join(", ") || "none"
          }`
        );
        // Continue anyway since we found the message
      }

      const headers = fullMsg.payload?.headers || [];
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "No subject";
      const from =
        headers.find((h) => h.name === "From")?.value || "Unknown sender";
      const to =
        headers.find((h) => h.name === "To")?.value || "Unknown recipient";
      const date =
        headers.find((h) => h.name === "Date")?.value || "Unknown date";
      const body = extractEmailBody(fullMsg.payload);

      console.log(
        `Successfully extracted sent email ${emailId} details. Subject: ${subject}`
      );

      // Generate summary only if body is not empty
      let summaryReply = {
        summary: "No content to summarize.",
        reply: "",
        source: "default",
      };

      if (body && body !== "No body content found.") {
        console.log(`Generating summary for sent email ${emailId}...`);
        try {
          // Use session-bound cache for summary and reply
          summaryReply = await summarizeAndReplyWithFallback(
            req.sessionID,
            body
          );
        } catch (summaryErr) {
          console.error(`Error generating summary: ${summaryErr.message}`);
          // Continue with default summary if summarization fails
        }
      } else {
        console.log(
          `Email ${emailId} has no body content, skipping summarization`
        );
      }

      const emailDetail = {
        id: emailId,
        subject,
        from,
        to,
        date,
        body,
        snippet: fullMsg.snippet || "",
        summary: summaryReply.summary,
        reply: summaryReply.reply,
        source: summaryReply.source,
        emailType: "sent",
      };

      // Cache the result
      req.sessionCache.set(cacheKey, emailDetail, CACHE_EXPIRY.EMAIL_DETAIL);
      console.log(`Successfully processed sent email ${emailId}`);

      return res.json(emailDetail);
    } catch (err) {
      console.error(`Gmail API error (sent email detail ${emailId}):`, err);

      if (err.code === 404 || err.response?.status === 404) {
        return res.status(404).json({ error: "Email not found" });
      }

      if (err.code === 401 || err.response?.status === 401) {
        return res
          .status(401)
          .json({ error: "Authentication expired. Please login again." });
      }

      throw err; // Re-throw for the outer catch block
    }
  } catch (err) {
    console.error(`❌ Failed to fetch sent email:`, err);
    res.status(500).json({
      error: "Failed to fetch sent email",
      message: err.message || "Unknown error",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

app.get("/api/emails/:id", ensureValidToken, async (req, res) => {
  const emailId = req.params.id;
  if (!emailId) return res.status(400).json({ error: "Missing email ID" });

  try {
    // Check if this is a sent email or regular inbox email
    const emailSource = req.query.source || "inbox";

    // Create a cache key that includes the source
    const cacheKey = `${CACHE_KEYS.EMAIL_DETAIL}${emailSource}_${emailId}`;
    const cachedEmail = req.sessionCache.get(cacheKey);
    if (cachedEmail && !req.query.refresh) {
      console.log(`📋 Cache hit for ${emailSource} email detail ${emailId}`);
      return res.json(cachedEmail);
    }

    console.log(
      `🔍 Cache miss for ${emailSource} email detail ${emailId}, fetching from Gmail...`
    );
    oAuth2Client.setCredentials(req.session.tokens);
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const { data: fullMsg } = await gmail.users.messages.get({
      userId: "me",
      id: emailId,
      format: "full",
    });

    const headers = fullMsg.payload.headers;
    const subject =
      headers.find((h) => h.name === "Subject")?.value || "No subject";
    const from =
      headers.find((h) => h.name === "From")?.value || "Unknown sender";
    const to =
      headers.find((h) => h.name === "To")?.value || "Unknown recipient";
    const date =
      headers.find((h) => h.name === "Date")?.value || "Unknown date";
    const body = extractEmailBody(fullMsg.payload);

    // Use session-bound cache for summary and reply
    const summaryReply = await summarizeAndReplyWithFallback(
      req.sessionID,
      body
    );

    const emailDetail = {
      id: emailId,
      subject,
      from,
      to,
      date,
      body,
      snippet: fullMsg.snippet,
      summary: summaryReply.summary,
      reply: summaryReply.reply,
      source: summaryReply.source,
      emailSource, // Add the source to the response
    };

    // Cache the result
    req.sessionCache.set(cacheKey, emailDetail, CACHE_EXPIRY.EMAIL_DETAIL);

    res.json(emailDetail);
  } catch (err) {
    console.error(`❌ Failed to fetch email:`, err);
    res
      .status(500)
      .json({ error: "Failed to fetch email", message: err.message });
  }
});

// Standalone Classify with caching
app.post("/api/classify", ensureValidToken, async (req, res) => {
  const { subject, body } = req.body;
  if (!subject || !body)
    return res.status(400).json({ error: "Missing subject or body" });

  try {
    const result = await classfying_with_fallback(req.sessionID, subject, body);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Classification failed", message: err.message });
  }
});

// Standalone Summarize with caching
app.post("/api/summarize", ensureValidToken, async (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: "Missing email body" });

  try {
    const result = await summarizeAndReplyWithFallback(req.sessionID, body);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Summarization failed", message: err.message });
  }
});

// Clear cache endpoint
app.post("/api/clear-cache", ensureValidToken, (req, res) => {
  try {
    sessionCache.clearSession(req.sessionID);
    res.json({ success: true, message: "Cache cleared successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to clear cache", message: err.message });
  }
});

app.get("/api/emails", ensureValidToken, async (req, res) => {
  try {
    // Check cache first
    const cachedEmails = req.sessionCache.get(CACHE_KEYS.EMAIL_LIST);
    if (cachedEmails && !req.query.refresh) {
      console.log("📋 Cache hit for email list");
      return res.json(cachedEmails);
    }

    console.log("🔍 Cache miss for email list, fetching from Gmail...");

    // Verify token before proceeding
    if (!req.session?.tokens?.access_token) {
      console.error("Missing access token in session");
      return res
        .status(401)
        .json({ error: "Authentication required. Please login again." });
    }

    try {
      oAuth2Client.setCredentials(req.session.tokens);
      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

      console.log("Fetching message list from Gmail API...");
      const { data } = await gmail.users.messages.list({
        userId: "me",
        maxResults: 30,
        labelIds: ["INBOX"],
      });

      const messages = data.messages || [];
      console.log(`Found ${messages.length} messages`);

      const emails = [];
      const fetchPromises = [];

      // Process emails in parallel for better performance
      for (const msg of messages) {
        fetchPromises.push(
          (async () => {
            try {
              const { data: fullMsg } = await gmail.users.messages.get({
                userId: "me",
                id: msg.id,
                format: "full",
              });

              const headers = fullMsg.payload.headers;
              const subject =
                headers.find((h) => h.name === "Subject")?.value ||
                "No subject";
              const from =
                headers.find((h) => h.name === "From")?.value ||
                "Unknown sender";
              const date =
                headers.find((h) => h.name === "Date")?.value || "Unknown date";
              const body = extractEmailBody(fullMsg.payload);

              // Use session-bound cache for classification
              const classification = await classfying_with_fallback(
                req.sessionID,
                subject,
                body
              );

              emails.push({
                id: msg.id,
                subject,
                from,
                date,
                snippet: fullMsg.snippet,
                classification,
              });
            } catch (err) {
              console.error(`Error processing message ${msg.id}:`, err);
              // Continue with other messages despite this error
            }
          })()
        );
      }

      await Promise.all(fetchPromises);
      console.log(`Successfully processed ${emails.length} emails`);

      // Sort emails by priority (high > medium > low)
      emails.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (
          priorityOrder[a.classification?.priority] -
          priorityOrder[b.classification?.priority]
        );
      });

      // Cache the result
      req.sessionCache.set(
        CACHE_KEYS.EMAIL_LIST,
        emails,
        CACHE_EXPIRY.EMAIL_LIST
      );

      res.json(emails);
    } catch (err) {
      console.error("Gmail API error:", err);

      if (err.code === 401 || err.response?.status === 401) {
        return res
          .status(401)
          .json({ error: "Authentication expired. Please login again." });
      }

      throw err; // Re-throw for the outer catch block
    }
  } catch (err) {
    console.error("Error fetching emails:", err);
    res.status(500).json({
      error: "Failed to fetch emails",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// ----------------------------- Email Writing Routes -----------------------------
app.post("/api/email/send", ensureValidToken, emailWritingController.sendEmail);
app.post(
  "/api/email/draft",
  ensureValidToken,
  emailWritingController.saveDraft
);
app.get(
  "/api/email/draft/:draftId",
  ensureValidToken,
  emailWritingController.getDraft
);
app.get(
  "/api/email/drafts",
  ensureValidToken,
  emailWritingController.listDrafts
);
app.delete(
  "/api/email/draft/:draftId",
  ensureValidToken,
  emailWritingController.deleteDraft
);

// Add calendar events endpoint
app.get("/api/calendar/events", ensureValidToken, async (req, res) => {
  try {
    // Check cache first
    const cachedEvents = req.sessionCache.get(CACHE_KEYS.CALENDAR_EVENTS);
    if (cachedEvents && !req.query.refresh) {
      console.log("📋 Cache hit for calendar events");
      return res.json(cachedEvents);
    }

    console.log(
      "🔍 Cache miss for calendar events, fetching from Google Calendar..."
    );

    // Verify token before proceeding
    if (!req.session?.tokens?.access_token) {
      console.error("Missing access token in session");

      return res
        .status(401)
        .json({ error: "Authentication required. Please login again." });
    }
    try {
      oAuth2Client.setCredentials(req.session.tokens);
      const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

      // Get events from primary calendar
      const timeMin = new Date();
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 14); // Get events for next 14 days

      console.log("Fetching calendar events from Google Calendar API...");
      const { data } = await calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10,
      });

      console.log(`Found ${data.items.length} calendar events`);

      // Cache the result
      req.sessionCache.set(
        CACHE_KEYS.CALENDAR_EVENTS,
        data.items,
        CACHE_EXPIRY.CALENDAR_EVENTS
      );

      res.json(data.items);
    } catch (err) {
      console.error("Google Calendar API error:", err);

      if (err.code === 401 || err.response?.status === 401) {
        return res
          .status(401)
          .json({ error: "Authentication expired. Please login again." });
      }

      throw err; // Re-throw for the outer catch block
    }
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch calendar events", message: err.message });
  }
});

// Make oAuth client accessible to DataProvider
app.locals.oAuth2Client = oAuth2Client;

// Add this code right before the server start section
// ----------------------------- Debug Helpers -----------------------------
// Log all registered routes to help with debugging
logRoutes(app);

// Test specific route matching
testRouteMatching(app, "/api/emails/sent");
testRouteMatching(app, "/api/emails/123");

// ----------------------------- Server Start -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(
    `📁 Session files stored in ${path.join(__dirname, "../sessions")}`
  );
});

// Export for testing
export default app;
