const express = require("express");
const mongoose = require("mongoose");
const redisClient = require("../config/redis");
const Router = express.Router();

const dependencyCheck = async (req, res) => {
  const databaseready =
    mongoose.connection.readyState === 1 ? "Healthy" : "Unhealthy";
  const redisready = redisClient.isReady ? "Healthy" : "Unhealthy";
  let status = "Healthy";
  let statusCode = 200;
  if (databaseready === "Unhealthy" || redisready === "Unhealthy") {
    status = "Unhealthy";
    statusCode = 503
  }

  return res.status(statusCode).json({
    message : {
        status : status,
        dependencies : {
            mongodb : databaseready,
            redis : redisready
        }
    }
  });
};

Router.get("/dependencies", dependencyCheck);

module.exports = Router;
