require('dotenv').config();

const { Worker } = require('bullmq');
const { UAParser } = require('ua-parser-js');
const geoip = require('geoip-lite');
const mongoose = require('mongoose');
const Click = require('../models/Click');

// ---- Configuration ----
const CONNECTION = {
  url: process.env.REDIS_URL || 'redis://redis:6379',
};

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/my_db';

// ---- Batching ----
const BATCH_SIZE = 100;   // Flush every 100 clicks
const BATCH_TIMEOUT = 5000; // Or every 5 seconds, whichever comes first

let batch = [];
let flushTimer = null;

async function flushBatch() {
  if (batch.length === 0) return;

  const clicks = batch.splice(0); // Atomically take the batch
  clearTimeout(flushTimer);
  flushTimer = null;

  try {
    await Click.insertMany(clicks, { ordered: false });
    console.log(`[clickWorker] Flushed ${clicks.length} clicks to MongoDB`);
  } catch (err) {
    console.error('[clickWorker] Batch flush error:', err.message);
    // Don't re-queue — lost clicks in edge cases are acceptable for analytics
  }
}

function scheduleFlush() {
  if (flushTimer) return; // Already scheduled
  flushTimer = setTimeout(flushBatch, BATCH_TIMEOUT);
}

/**
 * Parse a single click job and add it to the batch buffer.
 */
async function processClickJob(job) {
  const { shortCode, ip, userAgent, referrer, timestamp } = job.data;

  // Parse user-agent
  let deviceType = null;
  let browser = null;
  let os = null;

  if (userAgent) {
    try {
      const parser = new UAParser(userAgent);
      const uaResult = parser.getResult();

      if (uaResult.device && uaResult.device.type) {
        deviceType = uaResult.device.type; // 'mobile' | 'tablet' | 'console' | etc.
      } else {
        deviceType = 'desktop';
      }

      browser = uaResult.browser?.name || null;
      os = uaResult.os?.name || null;
    } catch {
      // Silently ignore parse errors
    }
  }

  // Parse geo IP
  let country = null;
  let region = null;
  let city = null;

  if (ip) {
    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        country = geo.country || null;
        region = geo.region || null;
        city = geo.city || null;
      }
    } catch {
      // Silently ignore geo lookup errors
    }
  }

  // Add to batch
  batch.push({
    shortCode,
    ip,
    country,
    region,
    city,
    deviceType,
    browser,
    os,
    referrer,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  });

  // Flush if batch is full
  if (batch.length >= BATCH_SIZE) {
    await flushBatch();
  } else {
    scheduleFlush();
  }
}

// ---- Main ----
(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('[clickWorker] Connected to MongoDB');

    // Create BullMQ worker
    const worker = new Worker('click-events', async (job) => {
      await processClickJob(job);
    }, {
      connection: CONNECTION,
      concurrency: 10, // Process up to 10 jobs concurrently
      limiter: {
        max: 500,      // Max 500 jobs per duration
        duration: 1000, // per second
      },
    });

    worker.on('completed', (job) => {
      console.log(`[clickWorker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[clickWorker] Job ${job?.id} failed:`, err.message);
    });

    console.log('[clickWorker] Worker started, listening for click-events queue...');

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n[clickWorker] ${signal} received. Flushing remaining batch...`);
      await flushBatch();
      await worker.close();
      await mongoose.connection.close();
      console.log('[clickWorker] Shutdown complete.');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('[clickWorker] Failed to start:', err.message);
    process.exit(1);
  }
})();
