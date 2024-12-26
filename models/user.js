const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    languageCode: { type: String },
    points: { type: Number, default: 0 }, // Added points with a default value of 0
    characterUrl: { type: String, default: "" } // New field for character image URL
});

module.exports = mongoose.model('User', UserSchema);