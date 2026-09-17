const { Worker } = require("bullmq");
const notificationdlq = require("./queue/notification.dlq");
const metrices = require("./metrices/metrices");
const logger = require("./utils/logger");
const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: 6379,
};

// new worker("queuename" , work processor , workeroptions(like connections))
const worker = new Worker(
  "notifications",
  async (job) => {
    logger.info("Job started", {
      pid: process.pid,
      jobId: job.id,
    });


    throw new Error("For testing failure")
    await new Promise((resolve) => setTimeout(resolve, 5000));

    logger.info("Job Finished", {
      pid: process.pid,
      jobId: job.id,
    });

    await metrices.processedjobs();
  },
  {
    connection,
    concurrency: 3,
  },
);

// notification queue.add("jobname" , jobdata , joboptions )

worker.on("failed", async (job, err) => {
  logger.error("Job failed", {
    pid: process.pid,
    jobId: job.id,
    attemptsMade: job.attemptsMade,
    error: err.message,
  });
  if (job.attemptsMade < job.opts.attempts) {
    logger.warn("Job will be retried", {
      jobId: job.id,
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts,
    });
    await metrices.retryCount();
  } else {
    logger.error("Job moved to DLQ" , {
      jobId : job.id,
      attemptsMade : job.attemptsMade,
      error : err.message
    })
    await notificationdlq.add("failed-jobs", job.data);
    await metrices.failedjobs();
  }
});

const shutdown = async () => {
  logger.info("Shutting down worker");
  await worker.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

logger.info("Worker started", {
  pid: process.pid,
});
