// utils/logPoints.js
const calculate24HourStats = require("./calculate24HourStats");

const logPoints = async (user, amount, session) => {
  user.pointsLog.push({ amount, timestamp: new Date() });
  user.pointsEarnedIn24Hrs = calculate24HourStats(user.pointsLog);
  user.points += amount;
  await user.save({ session });
};

module.exports = logPoints;