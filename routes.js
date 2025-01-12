// routes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

// Import your Mongoose models
const User = require("./models/user");
const Quest = require("./models/quests");
const ShopItem = require("./models/shopItem");
const UserInventory = require("./models/userInventory");
const Friend = require("./models/friends");
const Token = require('./models/Token'); 

// Imported Utils
const { seedDailyQuests } = require("./utils/manualQuestSeeder");

// Generate Token Route
router.post('/auth/generate-token', async (req, res) => {
  const { token, telegramId } = req.body;

  if (!token || !telegramId) {
      return res.status(400).json({ message: 'Token and telegramId are required.' });
  }

  try {
      // Check if user exists; if not, create a new user
      let user = await User.findOne({ telegramId });
      if (!user) {
          user = new User({
              telegramId,
              points: 0,
              // Add other user fields as necessary
          });
          await user.save();
      }

      // Create a new token entry
      const newToken = new Token({ token, telegramId });
      await newToken.save();

      return res.status(201).json({ message: 'Token generated and stored successfully.' });
  } catch (error) {
      console.error('Error generating/storing token:', error);
      return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Verify Token Route
router.post('/auth/verify-token', async (req, res) => {
  const { token } = req.body;

  if (!token) {
      return res.status(400).json({ message: 'Token is required.' });
  }

  try {
      // Find the token in the database
      const tokenEntry = await Token.findOne({ token });

      if (!tokenEntry) {
          return res.status(400).json({ message: 'Invalid or expired token.' });
      }

      const { telegramId } = tokenEntry;

      // Optionally, delete the token to make it single-use
      await Token.deleteOne({ token });

      return res.status(200).json({ telegramId });
  } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(500).json({ message: 'Internal server error.' });
  }
});

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
      console.log(`User with Telegram ID ${telegramId} not found.`);
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

/**
 * POST /user
 * Creates a new user with Telegram details.
 * If the user already exists, returns the existing user.
 */
router.post("/user", async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, languageCode, referralCode } = req.body;

    if (!telegramId) {
      return res.status(400).json({ message: "Telegram ID is required." });
    }

    // Check if user already exists
    let user = await User.findOne({ telegramId });
    if (user) {
      console.log(`User with Telegram ID ${telegramId} already exists.`);
      return res.status(200).json({ message: "User already exists.", user });
    }

    // Start a transaction session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1) Create the new user
      user = new User({
        telegramId,
        username: username || "Unknown",
        firstName: firstName || "NoFirstName",
        lastName: lastName || "NoLastName",
        languageCode: languageCode || "en",
        points: 0,
        characterUrl: "",
      });

      await user.save({ session });

      // 2) Create a UserInventory for the new user
      const userInventory = new UserInventory({
        userId: user._id,
        items: [],
      });
      await userInventory.save({ session });

      // 3) Assign the default companion (e.g., "Quacker the Explorer")
      const defaultCompanion = await ShopItem.findOne({ name: "Quacker the Explorer" }).session(session);
      if (defaultCompanion) {
        userInventory.items.push({
          itemId: defaultCompanion._id,
          level: 1,
          pointsPerCycle: defaultCompanion.basePoints,
          locked: false,
          equipped: true,
        });

        user.characterUrl = defaultCompanion.imageUrl;
        await userInventory.save({ session });
        await user.save({ session });
      } else {
        console.warn("Default companion 'Quacker the Explorer' not found in ShopItem collection.");
      }

      // 4) Handle referral if referralCode is provided
      if (referralCode) {
        const inviter = await User.findOne({ telegramId: referralCode }).session(session);
        if (inviter) {
          // Avoid self-invite
          if (!inviter._id.equals(user._id)) {
            // Check if a friendship already exists
            const existingFriendship = await Friend.findOne({
              userId: inviter._id,
              friendId: user._id,
            }).session(session);

            if (!existingFriendship) {
              // Create a two-way friendship doc
              await Friend.create(
                [
                  { userId: inviter._id, friendId: user._id },
                  { userId: user._id, friendId: inviter._id },
                ],
                { session }
              );

              // 4a) Increase inviter's friend count by 1
              inviter.friendsCount += 1;

              // 4b) Award 50k points to both
              user.points += 50000;
              inviter.points += 50000;

              // 4c) Increase inviter's referralTokensEarned by 50k
              inviter.referralTokensEarned += 50000;

              // 4d) Mark this new user's "invitedBy"
              user.invitedBy = inviter._id;

              await inviter.save({ session });
              await user.save({ session });
            }
          }
        }
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`User created successfully: ${telegramId}`);
      res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
      // If anything fails inside the transaction, roll back
      await session.abortTransaction();
      session.endSession();
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
 * Fetch all available quests and prioritize social quests
 * GET /quests
 */
router.get("/quests", async (req, res) => {
  try {
    const { telegramId, limit = 10 } = req.query; 
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    // 1. Just find today's quests from the Quest collection (manual quest seeder already inserted them)
    let availableQuests = await Quest.find({ generationDate: today }).lean();

    // 2. If no quests seeded, you can optionally call seedDailyQuests() here,
    //    or just respond with an empty list. 
    //    If you want them auto-created, uncomment next lines:
    /*
    if (availableQuests.length === 0) {
      await seedDailyQuests();
      availableQuests = await Quest.find({ generationDate: today }).lean();
    }
    */

    // 3. Sort them or limit them if you want
    const questOrder = ["social", "points-based", "tap-based"];
    availableQuests.sort((a, b) => {
      return questOrder.indexOf(a.nature) - questOrder.indexOf(b.nature);
    });
    availableQuests = availableQuests.slice(0, parseInt(limit, 10));

    // 4. If telegramId provided, find user and figure out claimed statuses
    let user = null;
    if (telegramId) {
      user = await User.findOne({ telegramId })
        .populate("claimedSocialQuests pendingSocialQuestClaims");
    }

    // 5. Map each quest with user’s claim info
    const questsWithStatus = availableQuests.map((quest) => {
      let isClaimed = false;
      let isPending = false;

      if (user) {
        // Already claimed social quest?
        isClaimed = user.claimedSocialQuests.some(
          (claimedQuest) => claimedQuest._id.toString() === quest._id.toString()
        );
        // Or pending?
        isPending = user.pendingSocialQuestClaims.some(
          (pendingQuest) => pendingQuest._id.toString() === quest._id.toString()
        );
      }

      return {
        ...quest,
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
        message: "Quest claimed successfully",
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
 * Returns all shop items with locked/unlocked status and additional details for the user.
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

    // Map shop items with locked/unlocked status and additional details
    const itemsWithStatus = shopItems.map((item) => {
      const inventoryItem = userInventory
        ? userInventory.items.find((invItem) => invItem.itemId.toString() === item._id.toString())
        : null;
    
      return {
        ...item.toObject(),
        locked: inventoryItem ? inventoryItem.locked : true,
        level: inventoryItem ? inventoryItem.level : 0,
        pointsPerCycle: inventoryItem ? inventoryItem.pointsPerCycle : 0,
        equipped: inventoryItem ? inventoryItem.equipped : false, // ✅ ADD EQUIPPED STATUS
        upgradeCost: inventoryItem
          ? Math.floor(item.baseCost * Math.pow(item.upgradeMultiplier, inventoryItem.level))
          : item.baseCost, // Calculate upgrade cost if owned, else base cost
      };
    });

    res.status(200).json(itemsWithStatus);
  } catch (error) {
    console.error("Error fetching shop items:", error);
    res.status(500).json({ message: "Failed to fetch shop items" });
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

    // Calculate upgrade cost
    const upgradeCost =
      shopItem.baseCost * Math.pow(shopItem.upgradeMultiplier, item.level);

    // Calculate upgraded points based on the new level after upgrade
    const newLevel = item.level + 1;
    const upgradedPoints =
      shopItem.basePoints * Math.pow(shopItem.upgradeMultiplier, newLevel);

    console.log(`Upgrade Cost: ${upgradeCost}, Upgraded Points: ${upgradedPoints}`);

    // Check if the user has enough points
    if (user.points < upgradeCost) {
      return res
        .status(400)
        .json({ message: "Insufficient points to upgrade this item" });
    }

    // Deduct points from user
    user.points -= upgradeCost;

    // Upgrade the item
    item.level = newLevel;
    item.pointsPerCycle = Math.floor(upgradedPoints);

    console.log(
      `Item ${itemId} upgraded to level ${item.level} with pointsPerCycle ${item.pointsPerCycle}`
    );

    // Calculate the new upgrade cost for the next level
    const newUpgradeCost = Math.floor(
      shopItem.baseCost * Math.pow(shopItem.upgradeMultiplier, item.level)
    );

    // Save changes
    await user.save();
    await userInventory.save();

    // Fetch the updated shop item details to send back to frontend
    const updatedInventoryItem = userInventory.items.find(
      (invItem) => invItem.itemId.toString() === itemId
    );

    // Optionally, populate shop item details for comprehensive data
    const populatedItem = await ShopItem.findById(itemId).lean();

    res.status(200).json({
      message: "Item upgraded successfully",
      item: {
        ...populatedItem,
        locked: updatedInventoryItem.locked,
        level: updatedInventoryItem.level,
        pointsPerCycle: updatedInventoryItem.pointsPerCycle,
        upgradeCost: newUpgradeCost, // Include the new upgrade cost
      },
    });
  } catch (error) {
    console.error("Error upgrading item:", error);
    res.status(500).json({ message: "Failed to upgrade item" });
  }
});

/**
 * POST /shop/equip
 * Equips a companion item for the user (telegramId).
 */
router.post("/shop/equip", async (req, res) => {
  const { userId, itemId } = req.body; // userId is telegramId

  try {
    // 1. Fetch the user
    const user = await User.findOne({ telegramId: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Fetch the item from shop to ensure it is a companion
    const shopItem = await ShopItem.findById(itemId);
    if (!shopItem) return res.status(404).json({ message: "Shop item not found" });
    if (shopItem.type !== "companion") {
      return res
        .status(400)
        .json({ message: "Only companion items can be equipped." });
    }

    // 3. Get user inventory
    const userInventory = await UserInventory.findOne({ userId: user._id });
    if (!userInventory) {
      return res.status(404).json({ message: "User inventory not found" });
    }

    // 4. Check if user owns this item
    const inventoryItem = userInventory.items.find(
      (invItem) => invItem.itemId.toString() === itemId
    );
    if (!inventoryItem) {
      return res.status(400).json({ message: "User does not own this companion item." });
    }
    if (inventoryItem.locked) {
      return res.status(400).json({ message: "Item is still locked, cannot equip." });
    }

    // 5. Mark all other companion items as unequipped
    userInventory.items.forEach((invItem) => {
      // We can look up the ShopItem if we want to confirm type=companion
      if (invItem.equipped) {
        invItem.equipped = false;
      }
    });

    // 6. Equip the chosen item
    inventoryItem.equipped = true;
    await userInventory.save();

    // 7. Update user's characterUrl
    user.characterUrl = shopItem.imageUrl;
    await user.save();

    res.status(200).json({
      message: "Companion equipped successfully",
      characterUrl: user.characterUrl,
      updatedItem: {
        ...shopItem.toObject(),
        equipped: inventoryItem.equipped,
        locked: inventoryItem.locked,
        level: inventoryItem.level,
      },
    });
  } catch (error) {
    console.error("Error equipping companion:", error);
    res.status(500).json({ message: "Failed to equip companion" });
  }
});

/**
 * POST /shop/purchase
 * Purchases a shop item for the user using user.points, marks item locked=false in inventory
 */
router.post("/shop/purchase", async (req, res) => {
  const { userId, itemId } = req.body; // userId is telegramId

  try {
    // Find the user by telegramId
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

    // Add the purchased item to the user's inventory with locked: false and level: 1
    userInventory.items.push({
      itemId,
      level: 1,
      pointsPerCycle: shopItem.basePoints * Math.pow(shopItem.upgradeMultiplier, 1),
      locked: false, // item is now unlocked
    });

    // Save the updated user and inventory
    await user.save();
    await userInventory.save();

    // Fetch the updated shop item details to send back to frontend
    const updatedInventoryItem = userInventory.items.find(
      (invItem) => invItem.itemId.toString() === itemId
    );

    // Optionally, populate shop item details for comprehensive data
    const populatedItem = await ShopItem.findById(itemId).lean();

    res.status(200).json({
      message: "Item purchased successfully",
      item: {
        ...populatedItem,
        locked: updatedInventoryItem.locked,
        level: updatedInventoryItem.level,
        pointsPerCycle: updatedInventoryItem.pointsPerCycle,
      },
    });
  } catch (error) {
    console.error("Error purchasing item:", error);
    res.status(500).json({ message: "Failed to purchase item" });
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

    // Find the user's inventory, create if it doesn't exist
    let userInventory = await UserInventory.findOne({ userId: user._id });
    if (!userInventory) {
      userInventory = new UserInventory({ userId: user._id, items: [] });
      await userInventory.save();
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

// Define rate limiter for taps
const tapsLimiter = rateLimit({
  windowMs: 1 * 1000, // 1 second window
  max: 1000, // limit each IP to 60 requests per windowMs
  message: "Too many taps from this IP, please try again later.",
});

/**
 * POST /taps
 * Increment tapsToday and pointsToday for the user in batches.
 */
router.post("/taps", tapsLimiter, async (req, res) => {
  const { telegramId, increment } = req.body; // `increment` can be >1 for batch taps

  // Validate input
  if (!telegramId || !Number.isInteger(increment) || increment <= 0) {
    return res.status(400).json({
      message: "Invalid request payload. Provide valid telegramId and positive integer increment.",
    });
  }

  try {
    // Perform atomic update using $inc
    const updatedUser = await User.findOneAndUpdate(
      { telegramId },
      {
        $inc: {
          tapsToday: increment,
          pointsToday: increment,
          points: increment,
        },
      },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Respond with updated stats
    res.status(200).json({
      message: "Taps and points incremented successfully.",
      tapsToday: updatedUser.tapsToday,
      pointsToday: updatedUser.pointsToday,
      totalPoints: updatedUser.points,
    });
  } catch (error) {
    console.error("Error logging taps:", error.message);
    res.status(500).json({ message: "Failed to log taps.", error: error.message });
  }
});

/**
 * GET /friends/:telegramId
 * Retrieves a list of friends for the given Telegram ID.
 */
router.get("/friends/:telegramId", async (req, res) => {
  try {
    const { telegramId } = req.params;
    console.log(`Fetching friends for Telegram ID: ${telegramId}`);

    // Step 1: Find the user by telegramId
    const user = await User.findOne({ telegramId });
    console.log("User found:", user);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Step 2: Find the user's friends
    const friends = await Friend.find({ userId: user._id })
      .populate("friendId", "username points galaxyLevel")
      .exec();
    console.log("Friends retrieved:", friends);

    // Step 3: Handle case where no friends are found
    if (!friends || friends.length === 0) {
      return res.status(200).json({ friends: [] });
    }

    // Step 4: Return the friends list
    res.status(200).json({ friends });
  } catch (error) {
    console.error("Error fetching friends list:", error);
    res.status(500).json({ message: "Error fetching friends list.", error: error.message });
  }
});

router.get("/referral/:telegramId", (req, res) => {
  const { telegramId } = req.params;
  const referralLink = `https://yourapp.com/signup?ref=${telegramId}`;
  res.status(200).json({ referralLink });
});

/**
 * Define fixed 7-day rewards
 */
const fixedDailyRewards = [
  { day: 1, reward: 100 },
  { day: 2, reward: 150 },
  { day: 3, reward: 200 },
  { day: 4, reward: 250 },
  { day: 5, reward: 300 },
  { day: 6, reward: 350 },
  { day: 7, reward: 500 }, // Maximum cycle reward
];

/**
 * POST /daily-reward
 * Allows a user to claim their daily reward based on a 24-hour timer.
 */
router.post("/daily-reward", async (req, res) => {
  try {
    const { telegramId } = req.body;

    if (!telegramId) {
      return res.status(400).json({ message: "Telegram ID is required." });
    }

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const now = new Date();

    if (user.lastClaimed) {
      const timeDifference = now - user.lastClaimed; // Difference in milliseconds
      const hoursDifference = timeDifference / (1000 * 60 * 60);

      if (hoursDifference < 24) {
        const nextClaimTime = user.lastClaimed.getTime() + 86400 * 1000; // Exact next claim time in ms
        const timeRemainingMs = nextClaimTime - Date.now();
      
        const hoursLeft = Math.floor(timeRemainingMs / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
      
        return res.status(400).json({
          message: `Daily reward already claimed. Try again in ${hoursLeft} hours and ${minutesLeft} minutes.`,
          lastClaimed: user.lastClaimed,
        });
      }

      if (hoursDifference >= 24 && hoursDifference < 48) {
        // On-Time Claim: Increment the cycle
        user.currentCycleDay += 1;
        if (user.currentCycleDay > 7) {
          user.currentCycleDay = 1; // Reset after day 7
        }
      } else if (hoursDifference >= 48) {
        // Missed Claim: Reset the cycle
        user.currentCycleDay = 1;
      }
    } else {
      // First-time claiming
      user.currentCycleDay = 1;
    }

    const rewardForToday = fixedDailyRewards[user.currentCycleDay - 1].reward;

    // Update user's points and lastClaimed
    user.points += rewardForToday;
    user.lastClaimed = now;

    // Save the user
    await user.save();

    res.status(200).json({
      message: `Daily reward claimed successfully! You received ${rewardForToday} points.`,
      pointsEarned: rewardForToday,
      totalPoints: user.points,
      currentCycleDay: user.currentCycleDay,
    });
  } catch (error) {
    console.error("Error claiming daily reward:", error);
    res.status(500).json({
      message: "Failed to claim daily reward.",
      error: error.message,
    });
  }
});

/**
 * GET /daily-rewards/:telegramId
 * Retrieves the user's daily rewards status, including the current cycle day and claim eligibility,
 * along with the list of daily rewards and their claimed statuses.
 */
router.get("/daily-rewards/:telegramId", async (req, res) => {
  try {
    const { telegramId } = req.params;

    if (!telegramId) {
      return res.status(400).json({ message: "Telegram ID is required." });
    }

    // Find the user by telegramId
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const now = new Date();

    let canClaim = false;
    let timeLeft = null;

    if (user.lastClaimed) {
      const timeDifference = now - user.lastClaimed; // Difference in milliseconds
      const hoursDifference = timeDifference / (1000 * 60 * 60);

      if (hoursDifference >= 24 && hoursDifference < 48) {
        canClaim = true;
      } else if (hoursDifference >= 48) {
        canClaim = true; // User can claim but cycle will reset
      } else {
        const hoursLeft = 24 - Math.floor(hoursDifference);
        const minutesLeft = Math.floor((24 - hoursDifference - hoursLeft) * 60);
        timeLeft = `${hoursLeft}h ${minutesLeft}m`;
      }
    } else {
      // User hasn't claimed yet
      canClaim = true;
    }

    // Construct the rewards array based on currentCycleDay
    const rewards = fixedDailyRewards.map((reward) => ({
      day: reward.day,
      reward: reward.reward,
      claimed: reward.day < user.currentCycleDay,
      date: now.toISOString().split("T")[0], // Assuming all rewards are for today
    }));

    res.status(200).json({
      currentCycleDay: user.currentCycleDay || 0,
      canClaim: canClaim,
      timeLeft: timeLeft, // e.g., "5h 30m" or null
      totalPoints: user.points,
      rewards: rewards,
    });
  } catch (error) {
    console.error("Error fetching daily rewards:", error);
    res.status(500).json({ message: "Error fetching daily rewards.", error });
  }
});

/**
 * POST /seed-manual-quests
 * Manually seeds today's quests from the daily templates and assigns them to all users.
 */
router.post("/seed-manual-quests", async (req, res) => {
  try {
    await seedDailyQuests();
    res.status(200).json({ message: "Daily quests seeded (if not already)!" });
  } catch (error) {
    console.error("Error seeding daily quests:", error);
    res.status(500).json({ message: "Failed to seed daily quests", error: error.message });
  }
});

module.exports = router;