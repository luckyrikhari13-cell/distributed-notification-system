const redisclient = require("../config/redis");
const notificationqueue = require("../queue/notification.queue");
const deadLetterqueue = require("../queue/notification.dlq")

// Redis client = our Node.js connection/interface to Redis.
// Redis key = the name under which our counter is stored.
// Increment = Redis increases that stored number.
const processedjobs = async () => {
  await redisclient.incr("processedJobs");
};
const failedjobs = async () => {
  await redisclient.incr("failedJobs");
};
const retryCount = async () => {
  await redisclient.incr("retryCount");
};

const getMetrics = async () => {
  return {
    processedJobs: Number(await redisclient.get("processedJobs")),
    failedJobs: Number(await redisclient.get("failedJobs")),
    retryCount: Number(await redisclient.get("retryCount")),
    queueDepth: await notificationqueue.getWaitingCount(),
    dlqDepth : await deadLetterqueue.getWaitingCount()
  };
};
module.exports = { processedjobs, failedjobs, retryCount, getMetrics };
