require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const redis = require("./src/config/redis")
const ConnectDb = require("./src/db/db");
const app = require("./src/app");
const logger = require("./src/utils/logger")
ConnectDb();
logger.info("Logger imported successfully");

const PORT = 3000;
app.listen(PORT, () => {
  logger.info("The server is running successfully" , {
    port : PORT
  })
});



const shutdown = async()=>{
 logger.info("Shutting down server");
  await mongoose.connection.close();
  await redis.quit();

  process.exit(0);
}
process.on("SIGINT" ,shutdown );
process.on("SIGTERM" , shutdown);



