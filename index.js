const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const config = require("./config");
const routes = require("./routes"); // Import the centralized routes file
require("./scheduler"); // Import the scheduler

const app = express();

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173", // ✅ Local development
  "https://test-7-frontdev.vercel.app", // ✅ Production frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};

// Middleware
app.use(cors(corsOptions)); // ✅ Enable CORS
app.options("*", cors(corsOptions)); // ✅ Handle preflight requests
app.use(express.json()); // ✅ Use built-in JSON parsing

// MongoDB Connection
mongoose
  .connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("🚨 MongoDB Connection Error:", err.message);
    process.exit(1); // Exit process if DB fails to connect
  });

// Use the centralized routes file
app.use("/api", routes); // All routes are prefixed with /api

// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({ message: "❌ Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🚨 Global Error Handler:", err.stack);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

// Start Server
const PORT = config.port || 5050; // Default to 5050 if not set
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`)); // retry