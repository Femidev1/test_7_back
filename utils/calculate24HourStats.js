// utils/calculate24HourStats.js
const calculate24HourStats = (logs) => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  
    // Filter logs within the last 24 hours
    const recentLogs = logs.filter(log => new Date(log.timestamp).getTime() >= twentyFourHoursAgo);
  
    // Sum the relevant field (e.g., count, amount)
    const sum = recentLogs.reduce((acc, log) => acc + (log.count || log.amount || 0), 0);
  
    return sum;
  };
  
  module.exports = calculate24HourStats;