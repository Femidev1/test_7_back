// models/friend.js

const mongoose = require("mongoose");

const FriendSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  friendId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure uniqueness of each friendship pair
FriendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

module.exports = mongoose.model("Friend", FriendSchema);