const redisclient = require("../config/redis.js");

const rateLimiter = async (req, res, next) => {
  const clientId = req.body.clientId;

  if (clientId) {
    try {
      const key = `rate-limit:${clientId}`;

      const count = await redisclient.incr(key);

      if (count === 1) {
        await redisclient.expire(key, 60);
      }
      if (count > 5) {
        return res.status(429).json({
          message: "Rate Limit exceeded",
        });
      }
    } catch (err) {
      return res.status(500).json({
        message: "Rate limiter unavailable",
      });
    }
  }
  else{
    return res.status(400).json({
      message: "Bad request no clientId given"
    })
  }

  next();
};

module.exports = rateLimiter;
