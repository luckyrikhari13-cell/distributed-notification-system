const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack, { method: req.method, path: req.originalUrl });
  // err stack tells us from which location the error is coming from
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

module.exports = errorHandler;
