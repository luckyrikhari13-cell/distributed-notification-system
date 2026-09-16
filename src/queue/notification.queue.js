const {Queue} = require("bullmq");

const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port : 6379,
};

const notificationQueue = new Queue("notifications" , {
    connection
});

module.exports = notificationQueue;