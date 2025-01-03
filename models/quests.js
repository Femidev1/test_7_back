// models/quests.js

const mongoose = require("mongoose");

// Define the quest schema and assign it to questSchema
const questSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ["in-game", "external", "social"], required: true },
  nature: { type: String, enum: ["tap-based", "points-based", "social"], required: true },
  target: { type: Number, required: function () { return this.nature !== "social"; } }, // Optional for "social" quests
  condition: { type: String, required: function () { return this.nature === "social"; } }, // For "social" quests
  reward: { type: Number, required: true },
  imageURL: { type: String },
  expiresAt: { type: Date, required: true },
  isClaimed: { type: Boolean, default: false },
  generationDate: { type: Date, required: true },
  countsAsQuestCompletion: { type: Boolean, default: false },
});

// Pre-save hook to round the target to the nearest integer if it's not already
questSchema.pre('save', function(next) {
  if (this.target && !Number.isInteger(this.target)) {
    this.target = Math.round(this.target);
  }
  next();
});

// Export the Quest model
module.exports = mongoose.model("Quest", questSchema);