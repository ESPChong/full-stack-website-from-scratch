const { Queue } = require('bullmq');

let clickQueue = null;

function getClickQueue() {
  if (!clickQueue) {
    clickQueue = new Queue('click-events', {
      connection: {
        url: process.env.REDIS_URL || 'redis://redis:6379',
      },
      defaultJobOptions: {
        removeOnComplete: { count: 1000 }, // Keep last 1000 complete jobs
        removeOnFail: { count: 500 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });
  }
  return clickQueue;
}

module.exports = { getClickQueue };