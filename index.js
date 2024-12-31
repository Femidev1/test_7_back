const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');
const cron = require("node-cron");
const routes = require("./routes"); // Import the centralized routes file
require('./scheduler'); // Import the scheduler

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('MongoDB Connection Error:', err));

// Schedule the quest generation to run every day at midnight (server time)
cron.schedule("0 0 * * *", async () => {
    console.log("Running scheduled quest generation...");
    try {
        const generateInGameQuests = require('./utils/questGenerator'); // Dynamically import
        await generateInGameQuests();
        console.log("Scheduled quest generation completed.");
    } catch (error) {
        console.error("Error during scheduled quest generation:", error);
    }
});


// Use the centralized routes file
app.use("/api", routes); // All routes will be prefixed with /api

// Handle undefined routes
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
});

// Start Server
const PORT = config.port || 5050; // Default to 5050 if no port is defined in config
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));