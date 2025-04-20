const express = require("express")
const session = require("express-session")
const FileStore = require("session-file-store")(session)
const path = require("path")
const config = require("../config")
const cacheCleanupMiddleware = require("./utils/cacheMiddleware")
const emailRoutes = require("./routes/emailRoutes")

// Other imports for your existing routes and middleware

const app = express()

// Body parser middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session middleware
app.use(
  session({
    store: new FileStore({
      path: path.join(__dirname, "../sessions"),
      ttl: 86400, // 1 day in seconds
      retries: 0,
    }),
    secret: config.sessionSecret || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  }),
)

// Add cache cleanup middleware
app.use(
  cacheCleanupMiddleware({
    cleanupInterval: 30 * 60 * 1000, // 30 minutes
  }),
)

// Routes
app.use("/api", emailRoutes)
// Add your other routes here

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: "Something went wrong!" })
})

module.exports = app
