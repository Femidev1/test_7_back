const mongoose = require("mongoose");

const UserInventorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopItem" },
      level: { type: Number, default: 1 },
      pointsPerCycle: { type: Number, default: 0 },
      locked: { type: Boolean, default: true } // Added field
    }
  ]
});

module.exports = mongoose.model("UserInventory", UserInventorySchema);