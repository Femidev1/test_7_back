// models/user.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  languageCode: { type: String },
  points: { type: Number, default: 0 },
  characterUrl: { type: String, default: "" },
  galaxyLevel: { type: Number, default: 1 }, // Add this line,

  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  friendsCount: {
    type: Number,
    default: 0,
  },
  referralTokensEarned: {
    type: Number,
    default: 0,
  },

  // Daily Counters
  pointsToday: { type: Number, default: 0 },
  tapsToday: { type: Number, default: 0 },
  questsCompletedToday: { type: Number, default: 0 }, // Counts non-quest-based quests
   // Track claimed social quests
   claimedSocialQuests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quest" }],
   // Track pending social quest claims
   pendingSocialQuestClaims: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quest" }],
  // Quests array
  quests: [
    {
      questId: { type: mongoose.Schema.Types.ObjectId, ref: "Quest" },
      progress: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false },
      isClaimed: { type: Boolean, default: false },
      assignedAt: { type: Date, default: Date.now }, // When the quest was assigned
      expiresAt: { type: Date }, // When the quest expires
    },
  ],

});

module.exports = mongoose.model("User", UserSchema);