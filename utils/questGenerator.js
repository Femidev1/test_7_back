// utils/questGenerator.js
const Quest = require("../models/quests"); // Import Quest model

/**
 * Generate in-game quests dynamically and populate the Quest database.
 * Deletes quests from the previous day before generating new ones.
 */
const generateInGameQuests = async (count = 15) => {
  const rewardScaling = {
    "points-based": 10,
    "tap-based": 5,
  };

  const questTargets = {
    "points-based": [100, 500, 1000],
    "tap-based": [50, 200, 500],
    // Removed 'quest-based' quests
  };

  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0)); // Start of today
  const expiresAt = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1); // End of the day (23:59:59)

  const inGameQuests = [];

  // Generate quests dynamically
  for (const [nature, targets] of Object.entries(questTargets)) {
    targets.forEach((target) => {
      const reward = Math.ceil(target / rewardScaling[nature]); // Calculate reward

      inGameQuests.push({
        title: `Achieve ${target} ${nature.replace("-", " ")}!`,
        description: `Complete ${target} ${nature.replace("-", " ")} in 24 hours to earn ${reward} tokens!`,
        type: "in-game",
        nature, // Now only 'points-based' or 'tap-based'
        target,
        reward,
        imageURL: "https://via.placeholder.com/150", // Placeholder image
        expiresAt,
        isClaimed: false,
        generationDate: today, // Add a generation date to track the day
        // Removed countsAsQuestCompletion field
      });
    });
  }

  try {
    // Insert new quests for today
    const questsToInsert = inGameQuests.slice(0, count);
    if (questsToInsert.length > 0) {
      await Quest.insertMany(questsToInsert);
      console.log(`${questsToInsert.length} new in-game quests generated and saved successfully!`);
    } else {
      console.log("No new quests were needed for today.");
    }
  } catch (error) {
    console.error("Error generating in-game quests:", error);
  }
};

module.exports = generateInGameQuests;