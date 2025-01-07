const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    telegramId: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now, expires: '15m' },
});

module.exports = mongoose.model('Token', tokenSchema);