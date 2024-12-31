// seedQuests.js

const mongoose = require("mongoose");
const Quest = require("./models/quests"); // Adjust the path if necessary
const sampleQuests = require("./sampleQuests"); // Path to your sampleQuests.js file

const seedQuests = async () => {
  try {
    await mongoose.connect("mongodb+srv://Hppma:ZiwM7F3ckUAwPmlZ@hppma.myzqq.mongodb.net/?retryWrites=true&w=majority&appName=HPPMA", { // Replace 'yourdbname' with your actual DB name
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB for seeding.");

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Clear existing quests for today
    await Quest.deleteMany({ generationDate: today });
    console.log("Cleared existing quests for today.");

    // Insert sample quests
    await Quest.insertMany(sampleQuests);
    console.log("Sample quests seeded successfully.");

    mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (error) {
    console.error("Error seeding quests:", error);
  }
};

seedQuests();