const express = require("express");
const app = express();
app.use(express.json());


const notificationRoutes = require("./routes/notification.route")
const metricsRoutes = require("./routes/metrices.routes")
const healthRoutes = require("./routes/health.route")
const errormiddleware = require("./middleware/error.middleware")
app.use("/notifications",notificationRoutes);
app.use("/metrics" , metricsRoutes)
app.use("/health",healthRoutes)
app.use(errormiddleware)
app.get("/test-error", (req, res, next) => {
    const error = new Error("This is a test error");

    next(error);
});

module.exports = app