// utils/manageQuests.js
const Quest = require("../models/quests");
const User = require("../models/user");
const generateInGameQuests = require("./questGenerator");

const manageQuests = async (telegramId, maxQuests = 15) => {
  try {
    // Remove claimed or expired quests
    await Quest.deleteMany({
      $or: [{ isClaimed: true }, { expiresAt: { $lte: new Date() } }],
    });

    // Check current quest count
    const currentQuestCount = await Quest.countDocuments();
    if (currentQuestCount < maxQuests) {
      const questsToGenerate = maxQuests - currentQuestCount;
      await generateInGameQuests(questsToGenerate);
    }

    // Assign quests to user if telegramId is provided
    if (telegramId) {
      const user = await User.findOne({ telegramId });
      if (!user) throw new Error("User not found");

      const availableQuests = await Quest.find({ isClaimed: false, static: false }).lean();

      // Assign quests to the user
      user.quests = availableQuests.map((quest) => ({
        questId: quest._id,
        isClaimed: false,
        claimedAt: null,
      }));
      await user.save();
    }

    return { success: true };
  } catch (error) {
    console.error("Error managing quests:", error);
    return { success: false, error };
  }
};

module.exports = manageQuests;