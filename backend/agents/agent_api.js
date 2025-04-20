import dotenv from "dotenv"
dotenv.config()

import Together from "together-ai"
import fetch from "node-fetch"
import sessionCache from "../utils/sessionCache.js"

// Initialize Together AI Client
const client = new Together({
  apiKey: process.env.TOGETHER_API || "tgp_v1_cuSyUFiwWqPRVtm4WF3xG6-7ameLtqZHF85aQpqTshU",
})

function extractJSON(text) {
  if (!text || typeof text !== "string") return null
  const match = text.match(/\{[\s\S]*?\}/)
  return match ? match[0] : null
}

function truncateText(text, maxLength = 2000) {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text
}

/* ----------------------------- CACHE KEYS ----------------------------- */
const CACHE_KEYS = {
  EMAIL_META: "email_meta:",
  EMAIL_SUMMARY: "email_summary:",
}

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  META: 30 * 60 * 1000, // 30 minutes
  SUMMARY: 60 * 60 * 1000, // 1 hour
}

/* ----------------------------- TOGETHER AGENTS WITH CACHING ----------------------------- */
async function analyzeEmailMeta(sessionId, subject, body) {
  // Create a unique cache key based on subject and first line of body
  const firstLine = body.split("\n").filter(Boolean)[0] || ""
  const cacheKey = `${CACHE_KEYS.EMAIL_META}${subject}_${firstLine.substring(0, 50)}`

  // Try to get from cache first
  const cachedResult = sessionCache.get(sessionId, cacheKey)
  if (cachedResult) {
    console.log("📋 Cache hit for email meta analysis")
    return cachedResult
  }

  console.log("🔍 Cache miss for email meta, analyzing with AI...")
  const input = `Subject: ${subject}\nFirst line of body: ${firstLine}`
  const prompt = `
You are a classification agent for email triage. Return a valid JSON:

{
  "priority": "high" | "medium" | "low" | "urgent" | "important",
  "sentiment": "positive" | "neutral" | "negative",
  "label": "otp" | "work" | "meeting" | "personal" | "transaction" | "support" | "marketing" | "other",
  "intent": "inform" | "request" | "confirm" | "escalate" | "notify"
}

Input:
${input}`

  try {
    const response = await client.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      messages: [
        { role: "system", content: "Respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 300,
    })

    const content = response.choices?.[0]?.message?.content?.trim()
    const jsonText = extractJSON(content)
    if (!jsonText) throw new Error("No JSON found in Together response.")

    const result = { ...JSON.parse(jsonText), source: "together" }

    // Store in cache
    sessionCache.set(sessionId, cacheKey, result, CACHE_EXPIRY.META)

    return result
  } catch (err) {
    console.error("🛑 Together Classification Error:", err.message)
    throw err
  }
}

async function summarizeAndReply(sessionId, body, count = 5, replycount = 5) {
  // Create a cache key based on a hash of the email body
  const bodyHash = Buffer.from(body).toString("base64").substring(0, 40)
  const cacheKey = `${CACHE_KEYS.EMAIL_SUMMARY}${bodyHash}`

  // Try to get from cache first
  const cachedResult = sessionCache.get(sessionId, cacheKey)
  if (cachedResult) {
    console.log("📋 Cache hit for email summary and reply")
    return cachedResult
  }

  console.log("🔍 Cache miss for summary, generating with AI...")
  const prompt = `
You are an email assistant. Respond with valid JSON:
{
  "summary": "...",
  "reply": "..."
}
Email:
"""
${truncateText(body)}
"""
`

  try {
    const response = await client.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      messages: [
        { role: "system", content: "Respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 700,
    })

    const content = response.choices?.[0]?.message?.content?.trim()
    const jsonText = extractJSON(content)
    if (!jsonText) throw new Error("No JSON found in Together reply.")

    const result = { ...JSON.parse(jsonText), source: "together" }

    // Store in cache
    sessionCache.set(sessionId, cacheKey, result, CACHE_EXPIRY.SUMMARY)

    return result
  } catch (err) {
    console.error("🛑 Together Summarization Error:", err.message)
    throw err
  }
}

/* ----------------------------- OPENROUTER FALLBACK WITH CACHING ----------------------------- */
async function classifyEmailOpenRouter(sessionId, subject, body) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const firstLine = body.split("\n").filter(Boolean)[0] || ""

  // Use the same cache key format as the primary function
  const cacheKey = `${CACHE_KEYS.EMAIL_META}${subject}_${firstLine.substring(0, 50)}`

  // Check cache first (in case we're retrying after a failure)
  const cachedResult = sessionCache.get(sessionId, cacheKey)
  if (cachedResult) {
    console.log("📋 Cache hit for email meta analysis (fallback check)")
    return cachedResult
  }

  console.log("🔄 Using OpenRouter fallback for classification...")
  const prompt = `
You are a classification assistant. Respond only in this format:
{
  "priority": "high" | "medium" | "low" | "urgent" | "important",
  "sentiment": "positive" | "neutral" | "negative",
  "label": "otp" | "work" | "meeting" | "personal" | "transaction" | "support" | "marketing" | "other",
  "intent": "inform" | "request" | "confirm" | "escalate" | "notify"
}
Subject: ${subject}
First line: ${firstLine}
give me the json only`

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1",
        messages: [
          { role: "system", content: "Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
    })

    const content = (await response.json()).choices?.[0]?.message?.content?.trim()
    const jsonText = extractJSON(content)
    if (!jsonText) throw new Error("No JSON found in fallback classification.")

    const result = { ...JSON.parse(jsonText), source: "openrouter" }

    // Store in cache
    sessionCache.set(sessionId, cacheKey, result, CACHE_EXPIRY.META)

    return result
  } catch (err) {
    console.error("🛑 OpenRouter Classification Error:", err.message)
    throw err
  }
}

async function summarizeAndReplyOpenRouter(sessionId, body, count = 5, replycount = 5) {
  const apiKey = process.env.OPENROUTER_API_KEY

  // Use the same cache key format as the primary function
  const bodyHash = Buffer.from(body).toString("base64").substring(0, 40)
  const cacheKey = `${CACHE_KEYS.EMAIL_SUMMARY}${bodyHash}`

  // Check cache first (in case we're retrying after a failure)
  const cachedResult = sessionCache.get(sessionId, cacheKey)
  if (cachedResult) {
    console.log("📋 Cache hit for email summary (fallback check)")
    return cachedResult
  }

  console.log("🔄 Using OpenRouter fallback for summary...")
  const prompt = `
You are a helpful email assistant. Respond ONLY with:
{
  "summary": "...",
  "reply": "..."
}
Email:
retur in json only
"""
${truncateText(body)}
"""
`

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1",
        messages: [
          { role: "system", content: "Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 700,
      }),
    })

    const content = (await response.json()).choices?.[0]?.message?.content?.trim()
    const jsonText = extractJSON(content)
    if (!jsonText) throw new Error("No JSON found in fallback reply.")

    const result = { ...JSON.parse(jsonText), source: "openrouter" }

    // Store in cache
    sessionCache.set(sessionId, cacheKey, result, CACHE_EXPIRY.SUMMARY)

    return result
  } catch (err) {
    console.error("🛑 OpenRouter Reply Error:", err.message)
    throw err
  }
}

/* ----------------------------- FALLBACK WRAPPERS WITH SESSION ID ----------------------------- */
export async function classfying_with_fallback(sessionId, subject, body) {
  try {
    return await analyzeEmailMeta(sessionId, subject, body)
  } catch (error) {
    console.log("⚠️ Primary classification failed, using fallback")
    return await classifyEmailOpenRouter(sessionId, subject, body)
  }
}

export async function summarizeAndReplyWithFallback(sessionId, body, summaryLength = 5, replyLength = 5) {
  try {
    return await summarizeAndReply(sessionId, body, summaryLength, replyLength)
  } catch (error) {
    console.log("⚠️ Primary summarization failed, using fallback")
    return await summarizeAndReplyOpenRouter(sessionId, body, summaryLength, replyLength)
  }
}

// Function to clear all AI caches for a session
export function clearAICache(sessionId) {
  console.log(`🧹 Clearing AI caches for session ${sessionId}`)
  sessionCache.clearSession(sessionId)
}

// Export the cache module for direct access
export { sessionCache }


// ----------------------------- Test Runner -----------------------------
// ----------------------------- Test Runner -----------------------------
// async function test() {
//   const subject = "Reminder: Design Review Meeting Tomorrow";
//   const body = `
// Hi team,

// Just a quick reminder that our design review meeting is scheduled for tomorrow at 10 AM in Room B.
// Please bring any mockups, materials, or updates you want to present.

// Thanks,
// Alex`;

//   console.log("📌 Running classification with fallback...");
//   const classification = await classfying_with_fallback(subject, body);
//   console.log("📊 Classification Result:", classification);

//   console.log("\n📌 Running summarization + reply with fallback...");
//   const summaryReply = await summarizeAndReplyWithFallback(body);
//   console.log("🧠 Summary + Reply:", summaryReply);
// }

// // ✅ Run the test if this file is executed directly
// test()
