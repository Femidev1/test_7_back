// updateQuestTargets.js

const mongoose = require("mongoose");
const Quest = require("./models/quests"); // Adjust the path as necessary

const updateQuestTargets = async () => {
  try {
    await mongoose.connect("mongodb+srv://Hppma:ZiwM7F3ckUAwPmlZ@hppma.myzqq.mongodb.net/?retryWrites=true&w=majority&appName=HPPMA", { // Replace with your DB URI
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB.");

    // Fetch all quests
    const quests = await Quest.find({});

    // Iterate and update each quest's target
    for (let quest of quests) {
      if (quest.target && !Number.isInteger(quest.target)) {
        const originalTarget = quest.target;
        quest.target = Math.round(quest.target);
        await quest.save();
        console.log(`Updated Quest ID: ${quest._id} | Original Target: ${originalTarget} | New Target: ${quest.target}`);
      }
    }

    console.log("All applicable quest targets have been updated.");
    mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (error) {
    console.error("Error updating quest targets:", error);
  }
};

updateQuestTargets();