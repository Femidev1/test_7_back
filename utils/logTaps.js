// utils/logTaps.js
const calculate24HourStats = require("./calculate24HourStats");

const logTaps = async (user, count, session) => {
  user.tapsLog.push({ count, timestamp: new Date() });
  user.tapsMadeIn24Hrs = calculate24HourStats(user.tapsLog);
  await user.save({ session });
};

module.exports = logTaps;