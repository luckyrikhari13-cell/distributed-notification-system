const express = require("express");
const rateLimiter = require("../middleware/ratelimiter");
const Router = express.Router();
const notificationModel = require("../models/notification.model");
const notificationQueue = require("../queue/notification.queue");
const asynchandler = require("../middleware/asynchandler");

const createNotification = async (req, res) => {
  const { type, clientId, recipient, message } = req.body;
  const idempotencyKey = req.get("Idempotency-Key");
  if (!idempotencyKey) {
    return res.status(400).json({
      message: "BAD REQUEST Idempotency-Key header is required",
    });
  }

  // we are using application level checking and also database-level constraint
  // first case a req arrives and it exists in database we return the response imeedidatly with the retrived notification
  // second case -> two identical request arrives but our idempotency key is unique so only one can insert the key
  let notification = await notificationModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (notification) {
    return res.status(200).json({
      message: "MATCH FOUND",
      notification: notification,
    });
  }

  try {
    notification = await notificationModel.create({
      type: type,
      clientId: clientId,
      recipient: recipient,
      message: message,
      idempotencyKey: idempotencyKey,
    });
  } catch (err) {
    if (err.code === 11000) {
      const existingNotification = await notificationModel.findOne({
        idempotencyKey,
      });
      return res.status(200).json({
        message: "notification with same idempotency index found",
        Notification: existingNotification,
      });
    } else {
      throw err;
    }
  }

  // notification queue.add("jobname" , jobdata , joboptions )
  await notificationQueue.add(
    "notification-job",
    {
      notificationId: notification._id,
      clientId: notification.clientId,
      type: notification.type,
      recipient: notification.recipient,
      message: notification.message,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );
  return res.status(201).json({
    message: "notification created Successfully",
    notification,
  });
};

Router.post("/", rateLimiter, asynchandler(createNotification));
module.exports = Router;
