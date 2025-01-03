const mongoose = require("mongoose");

const ShopItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["character", "engine", "drone"], required: true },
  baseCost: { type: Number, required: true },   // Initial cost in points
  basePoints: { type: Number, required: true }, // Points earned per cycle
  upgradeMultiplier: { type: Number, default: 1.5 }, // Multiplier for cost/points on upgrade
  imageUrl: { type: String, required: true }, // URL to the item's image
});

module.exports = mongoose.model("ShopItem", ShopItemSchema);