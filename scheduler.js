// scheduler.js

const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('./models/user');
const { seedDailyQuests } = require("./utils/manualQuestSeeder");

// Function to reset daily counters
const resetDailyCounters = async () => {
  try {
    await User.updateMany(
      {},
      {
        $set: {
          pointsToday: 0,
          tapsToday: 0,
          questsCompletedToday: 0,
          questBasedQuestsCompletedToday: 0,
        },
      }
    );
    console.log('Daily counters reset successfully.');
  } catch (error) {
    console.error('Error resetting daily counters:', error);
  }
};

// Function to seed daily quests
const runSeedDailyQuests = async () => {
  try {
    await seedDailyQuests();
    console.log('Daily quests seeded successfully.');
  } catch (error) {
    console.error('Error seeding daily quests:', error);
  }
};

// Schedule the jobs to run at midnight UTC every day
cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled tasks at midnight UTC...');
  await resetDailyCounters();
  await runSeedDailyQuests();
}, {
  timezone: "UTC" // Ensure the scheduler runs based on UTC timezone
});