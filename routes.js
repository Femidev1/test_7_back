// routes.js

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Import your Mongoose models
const User = require("./models/user");
const Quest = require("./models/quests");
const ShopItem = require("./models/shopItem");
const UserInventory = require("./models/userInventory");

// Imported Utils
const generateInGameQuests = require("./utils/questGenerator"); // Update path if needed

/**
 * GET /user/:telegramId
 * Retrieves a user by their Telegram ID.
 */
router.get("/user/:telegramId", async (req, res) => {
  try {
    const { telegramId } = req.params;

    if (!telegramId) {
      return res.status(400).json({ message: "Telegram ID is required." });
    }

    // Find user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

/**
 * POST /user/:telegramId
 * Updates the user's points with a specific amount.
 */
router.post("/user/:telegramId", async (req, res) => {
  const { telegramId } = req.params; // Telegram ID from the URL
  const { points } = req.body; // Points to update in the request body

  try {
    // Validate payload
    if (!telegramId || typeof points !== "number") {
      return res
        .status(400)
        .json({ message: "Invalid payload. Provide a valid telegramId and points." });
    }

    // Find the user
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update user's points
    user.points += points;
    user.pointsToday += points;

    // Save the updated user
    await user.save();

    res.status(200).json({
      message: "User points updated successfully.",
      totalPoints: user.points,
      pointsToday: user.pointsToday,
    });
  } catch (error) {
    console.error("Error updating points:", error.message);
    res.status(500).json({ message: "Failed to update points.", error: error.message });
  }
});

/**
 * POST /user
 * Creates a new user with Telegram details in the existing User collection.
 */
router.post("/user", async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, languageCode } = req.body;

    let user = await User.findOne({ telegramId });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    user = new User({
      telegramId,
      username,
      firstName,
      lastName,
      languageCode,
    });
    await user.save();

    res.status(201).json({ message: "User saved successfully", user });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

/**
 * GET /leaderboard
 * Returns top users sorted by points, default limit=100.
 * Adjust limit if you want fewer or more.
 */
router.get("/leaderboard", async (req, res) => {
  try {
    const { limit } = req.query;
    // Default to 100 if none provided
    const max = parseInt(limit, 10) || 100;

    const users = await User.find().sort({ points: -1 }).limit(max);
    res.json(users);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

/**
 * Fetch all available quests and auto-manage
 * GET /quests
 */
router.get("/quests", async (req, res) => {
  try {
    const { telegramId } = req.query; // Pass telegramId to determine claim status
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Remove quests from the previous day
    const deleted = await Quest.deleteMany({ generationDate: { $lt: today } });
    console.log(`Deleted ${deleted.deletedCount} quests from previous days.`);

    // Check if quests have already been generated for today
    const questsForToday = await Quest.find({ generationDate: today });
    console.log(`Quests for today before generation: ${questsForToday.length}`);

    if (questsForToday.length === 0) {
      // Generate new quests for today
      await generateInGameQuests(); // Ensure this generates all quest types
    }

    // Fetch all quests for today without limiting
    const availableQuests = await Quest.find({ generationDate: today })
      .sort({ expiresAt: 1 }); // Removed .limit()
    
    console.log(`Total quests fetched for today: ${availableQuests.length}`);
    availableQuests.forEach((quest, index) => {
      console.log(`${index + 1}. [${quest.nature}] ${quest.title}`);
    });

    let user = null;

    if (telegramId) {
      // Fetch the user by telegramId
      user = await User.findOne({ telegramId }).populate("claimedSocialQuests pendingSocialQuestClaims");
    }

    // Map quests with claim status
    const questsWithStatus = availableQuests.map((quest) => {
      let isClaimed = false;
      let isPending = false;

      if (user) {
        isClaimed = user.claimedSocialQuests.some(
          (claimedQuest) => claimedQuest._id.toString() === quest._id.toString()
        );
        isPending = user.pendingSocialQuestClaims.some(
          (pendingQuest) => pendingQuest._id.toString() === quest._id.toString()
        );
      }

      return {
        ...quest.toObject(),
        isClaimed,
        isPending,
      };
    });

    res.status(200).json({
      quests: questsWithStatus,
    });
  } catch (error) {
    console.error("Error fetching quests:", error);
    res.status(500).json({ message: "Error fetching quests.", error });
  }
});

/**
 * POST /quests/:questId/claim
 * Claim a quest and update relevant stats atomically.
 */
router.post("/quests/:questId/claim", async (req, res) => {
  const { questId } = req.params;
  const { telegramId } = req.body;

  // Validate input
  if (!telegramId) {
    return res.status(400).json({ message: "Telegram ID is required." });
  }

  try {
    // Validate questId
    if (!mongoose.Types.ObjectId.isValid(questId)) {
      return res.status(400).json({ message: "Invalid quest ID." });
    }

    // Start a Mongoose session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch user and quest within the session
      const user = await User.findOne({ telegramId }).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "User not found." });
      }

      const quest = await Quest.findById(questId).session(session);
      if (!quest) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Quest not found." });
      }

      // Handle based on quest nature
      if (quest.nature === "social") {
        // Check if user has already claimed this social quest
        const alreadyClaimed = user.claimedSocialQuests?.includes(questId);
        // Check if there's a pending claim
        const isPending = user.pendingSocialQuestClaims?.includes(questId);

        if (alreadyClaimed) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: "Social quest already claimed." });
        }

        if (isPending) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: "Social quest is currently being claimed. Please wait." });
        }

        // Mark the quest as pending
        user.pendingSocialQuestClaims.push(questId);
        await user.save({ session });

        // Commit the transaction to save the pending claim
        await session.commitTransaction();
        session.endSession();

        // Introduce a 10-second delay to simulate validation
        setTimeout(async () => {
          // Start a new session for updating after delay
          const delayedSession = await mongoose.startSession();
          delayedSession.startTransaction();
          try {
            // Re-fetch the user within the new session
            const delayedUser = await User.findOne({ telegramId }).session(delayedSession);
            const delayedQuest = await Quest.findById(questId).session(delayedSession);

            if (!delayedUser || !delayedQuest) {
              throw new Error("User or Quest not found during delayed processing.");
            }

            // Double-check if quest was already claimed
            if (delayedUser.claimedSocialQuests.includes(questId)) {
              throw new Error("Social quest already claimed.");
            }

            // Grant the reward
            delayedUser.points += delayedQuest.reward;

            // Move questId from pending to claimed
            delayedUser.claimedSocialQuests.push(questId);
            delayedUser.pendingSocialQuestClaims = delayedUser.pendingSocialQuestClaims.filter(
              (id) => id.toString() !== questId
            );

            // Save the updated user within the delayed session
            await delayedUser.save({ session: delayedSession });

            // Optionally, delete the quest if it's a one-time claim
            // await Quest.findByIdAndDelete(questId).session(delayedSession);

            // Commit the delayed transaction
            await delayedSession.commitTransaction();
            delayedSession.endSession();

            console.log(`Social quest ${questId} claimed successfully for user ${telegramId}.`);
          } catch (error) {
            // If any error occurs during delayed processing, remove the pending claim
            await delayedSession.abortTransaction();
            delayedSession.endSession();

            const cleanupSession = await mongoose.startSession();
            cleanupSession.startTransaction();
            try {
              const cleanupUser = await User.findOne({ telegramId }).session(cleanupSession);
              if (cleanupUser) {
                cleanupUser.pendingSocialQuestClaims = cleanupUser.pendingSocialQuestClaims.filter(
                  (id) => id.toString() !== questId
                );
                await cleanupUser.save({ session: cleanupSession });
              }
              await cleanupSession.commitTransaction();
              cleanupSession.endSession();
            } catch (cleanupError) {
              console.error("Error during cleanup of pending claims:", cleanupError);
            }

            console.error("Error during delayed quest claim:", error);
          }
        }, 10000); // 10-second delay

        // Immediately respond to the user indicating that the claim is being processed
        return res.status(200).json({
          message: "Social quest claim initiated. Please wait for validation.",
        });
      }

      // Existing logic for other quest types (points-based, tap-based)

      // Initialize variables
      let requirementMessage = null;
      let eligibleToClaim = false;

      if (quest.nature === "points-based") {
        if (user.pointsToday >= quest.target) {
          eligibleToClaim = true;
        } else {
          const shortfall = quest.target - user.pointsToday;
          requirementMessage = `You need ${shortfall} more points today to complete this quest.`;
        }
      } else if (quest.nature === "tap-based") {
        if (user.tapsToday >= quest.target) {
          eligibleToClaim = true;
        } else {
          const shortfall = quest.target - user.tapsToday;
          requirementMessage = `You need ${shortfall} more taps today to complete this quest.`;
        }
      } else {
        // Unknown quest type
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Unknown quest type." });
      }

      // If requirements not met, abort transaction and return error
      if (!eligibleToClaim) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: requirementMessage });
      }

      // At this point, the user meets the quest requirements.

      // Give the quest reward
      user.points += quest.reward;

      // Update the relevant counters
      if (quest.nature === "points-based") {
        // Subtract the points used to meet the quest
        user.pointsToday -= quest.target;
      } else if (quest.nature === "tap-based") {
        // Subtract the taps used to meet the quest
        user.tapsToday -= quest.target;
      }

      // For all quests, increment questsCompletedToday
      user.questsCompletedToday += 1;

      // Save the user within the session
      await user.save({ session });

      // Delete the quest from the database
      await Quest.findByIdAndDelete(questId).session(session);

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        message: "Quest claimed successfully and removed from the database.",
        points: user.points,
      });
    } catch (error) {
      console.error("Error claiming quest:", error);
      res.status(500).json({ message: "Error claiming quest.", error: error.message });
    }
  } catch (error) {
    console.error("Error claiming quest:", error);
    res.status(500).json({ message: "Error claiming quest.", error: error.message });
  }
});

/**
 * GET /shop
 * Returns all shop items with locked/unlocked status for the user.
 */
router.get("/shop", async (req, res) => {
  try {
    const { userId } = req.query; // `userId` is the telegramId
    if (!userId) {
      return res.status(400).json({ message: "Missing userId in query" });
    }

    // Fetch the user by their telegramId
    const user = await User.findOne({ telegramId: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch the user's inventory
    const userInventory = await UserInventory.findOne({ userId: user._id });

    // Fetch all shop items
    const shopItems = await ShopItem.find();

    // Map shop items with locked/unlocked status
    const itemsWithStatus = shopItems.map((item) => {
      const inventoryItem = userInventory
        ? userInventory.items.find(
            (invItem) => invItem.itemId.toString() === item._id.toString()
          )
        : null;

      return {
        ...item.toObject(),
        locked: inventoryItem ? inventoryItem.locked : true,
      };
    });

    res.status(200).json(itemsWithStatus);
  } catch (error) {
    console.error("Error fetching shop items:", error);
    res.status(500).json({ message: "Failed to fetch shop items" });
  }
});

/**
 * POST /shop/purchase
 * Purchases a shop item for the user using user.points, marks item locked=false in inventory
 */
router.post("/shop/purchase", async (req, res) => {
  const { userId, itemId } = req.body; // `userId` is the telegramId

  try {
    // Find the user by their telegramId
    const user = await User.findOne({ telegramId: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch the shop item being purchased
    const shopItem = await ShopItem.findById(itemId);
    if (!shopItem) return res.status(404).json({ message: "Item not found" });

    // Fetch or create the user's inventory
    let userInventory = await UserInventory.findOne({ userId: user._id });
    if (!userInventory) {
      userInventory = new UserInventory({ userId: user._id, items: [] });
    }

    // Check if the item is already owned
    const ownedItem = userInventory.items.find(
      (invItem) => invItem.itemId.toString() === itemId
    );
    if (ownedItem) {
      return res.status(400).json({ message: "Item already owned" });
    }

    // Ensure the user has enough points
    const itemCost = shopItem.baseCost;
    if (user.points < itemCost) {
      return res
        .status(400)
        .json({ message: "Insufficient points to purchase this item" });
    }

    // Deduct the item's cost from the user's points
    user.points -= itemCost;

    // Add the purchased item to the user's inventory with locked: false
    userInventory.items.push({
      itemId,
      level: 1,
      pointsPerCycle: shopItem.basePoints,
      locked: false, // item is now unlocked
    });

    // Save the updated user and inventory
    await user.save();
    await userInventory.save();

    res
      .status(200)
      .json({ message: "Item purchased successfully", inventory: userInventory });
  } catch (error) {
    console.error("Error purchasing item:", error);
    res.status(500).json({ message: "Failed to purchase item" });
  }
});

/**
 * POST /shop/upgrade
 * Upgrades an owned shop item, costing points and increasing item stats
 */
router.post("/shop/upgrade", async (req, res) => {
  const { userId, itemId } = req.body; // userId is telegramId

  try {
    // Find the user by telegramId
    const user = await User.findOne({ telegramId: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // user._id to query userInventory
    const userInventory = await UserInventory.findOne({ userId: user._id });
    if (!userInventory) {
      return res.status(404).json({ message: "User inventory not found" });
    }

    // Find the item in the user's inventory
    const item = userInventory.items.find(
      (invItem) => invItem.itemId.toString() === itemId
    );
    if (!item) return res.status(404).json({ message: "Item not owned" });

    // Find the shop item (for upgrade cost calculation)
    const shopItem = await ShopItem.findById(itemId);
    if (!shopItem) return res.status(404).json({ message: "Item not found" });

    // Calculate upgrade cost and points
    const upgradeCost =
      shopItem.baseCost * Math.pow(shopItem.upgradeMultiplier, item.level);
    const upgradedPoints =
      shopItem.basePoints * Math.pow(shopItem.upgradeMultiplier, item.level);

    // Deduct points from user
    if (user.points < upgradeCost) {
      return res
        .status(400)
        .json({ message: "Insufficient points to upgrade this item" });
    }

    user.points -= upgradeCost;

    // Upgrade the item
    item.level += 1;
    item.pointsPerCycle = upgradedPoints;

    // Save changes
    await user.save();
    await userInventory.save();

    res.status(200).json({ message: "Item upgraded successfully", item });
  } catch (error) {
    console.error("Error upgrading item:", error);
    res.status(500).json({ message: "Failed to upgrade item" });
  }
});

/**
 * POST /mine
 * "Mines" points from user-owned items + manual input.
 */
router.post("/mine", async (req, res) => {
  const { telegramId } = req.body;

  try {
    // Find the user
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find the user's inventory
    const userInventory = await UserInventory.findOne({ userId: user._id });
    if (!userInventory) {
      return res.status(404).json({ message: "User inventory not found" });
    }

    // Calculate auto-mined points from inventory
    const autoMinedPoints = userInventory.items.reduce(
      (acc, item) => acc + item.pointsPerCycle,
      0
    );

    // Define the fixed mining reward
    const miningReward = 20; // Fixed reward for mining
    const totalMinedPoints = autoMinedPoints + miningReward;

    // Update user's points and daily counters
    user.points += totalMinedPoints;
    user.pointsToday += totalMinedPoints;

    // Save the user
    await user.save();

    res.status(200).json({
      message: "Mining completed successfully",
      totalPoints: user.points,
      minedPoints: totalMinedPoints,
    });
  } catch (error) {
    console.error("Error during mining:", error);
    res.status(500).json({ message: "Failed to complete mining", error });
  }
});

/**
 * POST /taps
 * Increment tapsToday and pointsToday for the user
 */
router.post("/taps", async (req, res) => {
  const { telegramId, increment } = req.body;

  // Validate input
  if (!telegramId || !Number.isInteger(increment) || increment <= 0) {
    return res.status(400).json({
      message: "Invalid request payload. Provide valid telegramId and positive integer increment.",
    });
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Increment counters
    user.tapsToday += increment;
    user.pointsToday += increment;
    user.points += increment;

    // Save the user
    await user.save();

    // Respond with updated stats
    res.status(200).json({
      message: "Tap and points incremented successfully.",
      tapsToday: user.tapsToday,
      pointsToday: user.pointsToday,
      totalPoints: user.points,
    });
  } catch (error) {
    console.error("Error logging tap:", error.message);
    res.status(500).json({ message: "Failed to log taps.", error: error.message });
  }
});

module.exports = router;