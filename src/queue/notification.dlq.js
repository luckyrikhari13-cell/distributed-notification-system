const { Queue } = require("bullmq");

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: 6379,
};

const notificationdlq = new Queue("notifications-dlq", { connection });
module.exports = notificationdlq;
