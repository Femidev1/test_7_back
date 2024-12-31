// scheduler.js

const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('./models/user');

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

// Schedule the job to run at midnight every day
cron.schedule('0 0 * * *', () => {
  console.log('Running daily counters reset...');
  resetDailyCounters();
});