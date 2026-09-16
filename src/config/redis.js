const { createClient } = require("redis");
const logger = require("../utils/logger");
// Connect using the Redis protocol to Redis running on this computer at port 6379.
const redisclient = createClient({
  url: `redis://${process.env.REDIS_HOST || "localhost"}:6379`,
});

redisclient.on("error", (err) => {
  logger.error("Redis client error", {
    error: err.message,
  });
});

redisclient
  .connect()
  .then(() => {
    logger.info("Redis connection succeeded");
  })
  .catch((err) => {
    logger.error("Redis connection failed", {
      error: err.message,
    });
  });

module.exports = redisclient;
