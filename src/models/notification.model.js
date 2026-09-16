const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "email",
      enum: ["email", "sms", "push"],
    },
    clientId: {
      type: String,
      required: true,
    },
    recipient: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    idempotencyKey :{
      type:String,
      unique : true,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,  // timestamps will  do that automatically
  },
);

const notificationModel = mongoose.model("notification", notificationSchema);

module.exports = notificationModel;
