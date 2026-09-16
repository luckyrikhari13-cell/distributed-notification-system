const mongoose = require("mongoose");
const logger = require("../utils/logger");
async function ConnectDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("Database connected successfully");
  } catch (err) {
    logger.error("Database connection error", {
      error: err.message,
    });
  }
}
module.exports = ConnectDb;
