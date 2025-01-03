// utils/manualQuestSeeder.js

const Quest = require("../models/quests");
const User = require("../models/user");

// 1. Define your daily quest "templates". 
//    You can add/edit these manually as needed.
//    For example, three daily quests:
const dailyQuestTemplates = [
  {
    title: "Gain 100 Points Today!",
    description: "Earn 100 points in 24 hours",
    type: "in-game",
    nature: "points-based",
    target: 100,
    reward: 10,
    imageURL: "https://res.cloudinary.com/dhy8xievs/image/upload/v1735790134/Quacker_qape6b.jpg",
  },
  {
    title: "Tap 50 Times!",
    description: "Accumulate 50 taps in 24 hours",
    type: "in-game",
    nature: "tap-based",
    target: 50,
    reward: 5,
    imageURL: "https://res.cloudinary.com/dhy8xievs/image/upload/v1735790134/Quacker_qape6b.jpg",
  },
  {
    title: "Follow us on Twitter",
    description: "Click the link and follow us to earn a reward!",
    type: "social",
    nature: "social",
    condition: "Follow on Twitter",
    reward: 100,
    imageURL: "https://res.cloudinary.com/dhy8xievs/image/upload/v1735790134/Quacker_qape6b.jpg",
  },
];

async function seedDailyQuests() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiresAt = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

    // 2. Delete old quests from the previous day
    const deleted = await Quest.deleteMany({ generationDate: { $lt: today } });
    console.log(`Deleted ${deleted.deletedCount} old quests.`);

    // 3. Check if we already inserted today's quests
    const existingToday = await Quest.find({ generationDate: today });
    if (existingToday.length > 0) {
      console.log("Today's quests are already seeded. Skipping creation.");
      return;
    }

    // 4. Insert new quests from our dailyQuestTemplates
    const newQuestsData = dailyQuestTemplates.map((template) => ({
      title: template.title,
      description: template.description,
      type: template.type,
      nature: template.nature,
      target: template.target,          // only relevant if not social
      condition: template.condition,    // only relevant if social
      reward: template.reward,
      imageURL: template.imageURL,
      expiresAt: expiresAt,
      generationDate: today,
    }));

    const insertedQuests = await Quest.insertMany(newQuestsData);
    console.log("Inserted new daily quests:", insertedQuests);

    // 5. Push these new quests into every user's `quests` array
    const allUsers = await User.find({});
    for (const user of allUsers) {
      // For each newly inserted quest, push into user.quests
      insertedQuests.forEach((questDoc) => {
        user.quests.push({
          questId: questDoc._id,
          progress: 0,
          isCompleted: false,
          isClaimed: false,
          assignedAt: new Date(),
          expiresAt: questDoc.expiresAt,
        });
      });
      await user.save(); // Save each user
    }

    console.log("Assigned new daily quests to every user successfully.");
  } catch (error) {
    console.error("Error seeding daily quests:", error);
  }
}

module.exports = {
  seedDailyQuests,
};