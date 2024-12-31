// utils/logCompletedQuest.js
const calculate24HourStats = require("./calculate24HourStats");

const logCompletedQuest = async (user, questId, session) => {
  user.questsCompletedLog.push({ questId, completedAt: new Date() });
  user.questsCompletedIn24Hrs = calculate24HourStats(user.questsCompletedLog.map(q => ({ timestamp: q.completedAt })));
  await user.save({ session });
};

module.exports = logCompletedQuest;