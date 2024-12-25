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

module.exports = router;