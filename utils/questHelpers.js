const Quest = require("../models/quests"); // Import the Quest model

/**
 * Generates dynamic quests and populates them in the database.
 * @returns {Promise<void>}
 */
const generateDynamicQuests = async () => {
  try {
    // Define thresholds for each type of dynamic quest
    const thresholds = {
      pointsBased: [100, 500, 1000, 5000],
      tapBased: [50, 200, 500, 1000],
      questBased: [1, 3, 5, 10],
    };

    // Define reward scaling (adjust as needed)
    const rewardScaling = {
      pointsBased: 10,
      tapBased: 5,
      questBased: 20,
    };

    // Points-Based Quests
    for (const target of thresholds.pointsBased) {
      await Quest.create({
        title: `Earn ${target} Points in 24 Hours`,
        description: `Accumulate ${target} points within the last 24 hours to complete this quest.`,
        type: "in-game",
        nature: "points-based",
        target,
        reward: target / rewardScaling.pointsBased, // Scale reward
        imageURL: "", // Add a default image if needed
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire in 24 hours
        static: false,
      });
    }

    // Tap-Based Quests
    for (const target of thresholds.tapBased) {
      await Quest.create({
        title: `Make ${target} Taps in 24 Hours`,
        description: `Perform ${target} taps within the last 24 hours to complete this quest.`,
        type: "in-game",
        nature: "tap-based",
        target,
        reward: target / rewardScaling.tapBased, // Scale reward
        imageURL: "", // Add a default image if needed
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire in 24 hours
        static: false,
      });
    }

    // Quest-Based Quests
    for (const target of thresholds.questBased) {
      await Quest.create({
        title: `Complete ${target} Quests in 24 Hours`,
        description: `Finish ${target} quests within the last 24 hours to complete this challenge.`,
        type: "in-game",
        nature: "quest-based",
        target,
        reward: target * rewardScaling.questBased, // Scale reward
        imageURL: "", // Add a default image if needed
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire in 24 hours
        static: false,
      });
    }

    console.log("Dynamic quests generated successfully.");
  } catch (error) {
    console.error("Error generating dynamic quests:", error);
  }
};

module.exports = { generateDynamicQuests };