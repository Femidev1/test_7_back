// middleware/userMiddleware.js
const User = require("../models/user");

const fetchUser = async (req, res, next) => {
  const { telegramId } = req.params.telegramId || req.body.telegramId || req.query.userId;
  if (!telegramId) {
    return res.status(400).json({ message: "Missing telegramId." });
  }

  try {
    const user = await User.findOne({ telegramId }).populate("quests.questId");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

module.exports = { fetchUser };