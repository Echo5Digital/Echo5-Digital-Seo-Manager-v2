const Queue = require('bull');
const { logger } = require('../utils/logger');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create audit queue with extended timeout for long-running jobs
const auditQueue = new Queue('audit-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
    timeout: 600000, // 10 minutes timeout for long audits
  },
  settings: {
    lockDuration: 600000, // Lock for 10 minutes (longer than job timeout)
    lockRenewTime: 30000, // Renew lock every 30 seconds
    stalledInterval: 60000, // Check for stalled jobs every minute
    maxStalledCount: 2, // Max number of times a job can be recovered from stalled state
  },
});

// Queue event listeners for monitoring
auditQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed successfully`);
});

auditQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err.message);
});

auditQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

auditQueue.on('waiting', (jobId) => {
  logger.info(`Job ${jobId} is waiting`);
});

auditQueue.on('active', (job) => {
  logger.info(`Job ${job.id} is now active`);
});

auditQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} has stalled`);
});

auditQueue.on('progress', (job, progress) => {
  logger.info(`Job ${job.id} progress: ${progress}%`);
});

module.exports = auditQueue;
