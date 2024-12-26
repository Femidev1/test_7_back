const express = require('express');
const router = express.Router();
const User = require('./models/user');

// Save User Information
router.post('/user', async (req, res) => {
    try {
        const { telegramId, username, firstName, lastName, languageCode, points } = req.body;

        // Check if user already exists
        let user = await User.findOne({ telegramId });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Save new user
        user = new User({ telegramId, username, firstName, lastName, languageCode, points });
        await user.save();

        res.status(201).json({ message: 'User saved successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Fetch User Information
router.get('/user/:telegramId', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.telegramId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Update Points
router.post('/user/:telegramId', async (req, res) => {
    try {
        const { points } = req.body;
        const user = await User.findOneAndUpdate(
            { telegramId: req.params.telegramId },
            { points },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


//Leaderboard Routes
// Fetch Leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const { limit = 10 } = req.query; // Default limit to 10 users
        const users = await User.find()
            .sort({ points: -1 }) // Sort by points in descending order
            .limit(parseInt(limit)); // Limit results
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Seed test data for leaderboard
router.post('/seed', async (req, res) => {
    try {
        const testData = [
            { telegramId: "1", username: "Leader1", points: 500, characterUrl: "url1.png" },
            { telegramId: "2", username: "Leader2", points: 450, characterUrl: "url2.png" },
            { telegramId: "3", username: "Leader3", points: 400, characterUrl: "url3.png" },
            { telegramId: "4", username: "Player", points: 300, characterUrl: "url4.png" }
        ];

        await User.insertMany(testData); // Seed new data
        res.status(201).json({ message: "Test data seeded successfully" });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

module.exports = router;