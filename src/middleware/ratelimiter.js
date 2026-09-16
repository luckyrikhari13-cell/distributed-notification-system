const redisclient = require("../config/redis.js");

const rateLimiter = async (req, res, next) => {
  const clientId = req.body.clientId;

  try {
    const key = `rate-limit:${clientId}`;

    const count = await redisclient.incr(key);

    if(count===1){
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

  next();
};

module.exports = rateLimiter;
