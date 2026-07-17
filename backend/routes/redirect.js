const express = require('express');
const Url = require('../models/Url');
const { getCachedUrl, setCachedUrl } = require('../utils/urlCache');
const { getClickQueue } = require('../config/queue');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limit for redirects: generous since these are public
const redirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 redirects per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Enqueue a click event asynchronously. Fire-and-forget — errors are
 * caught silently to keep redirect latency low.
 */
function enqueueClickEvent(code, req) {
  try {
    const queue = getClickQueue();
    queue.add(
      'record-click',
      {
        shortCode: code,
        ip: req.ip || req.socket?.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
        referrer: req.headers.referer || req.headers.referrer || null,
        timestamp: new Date().toISOString(),
      },
      {
        // Don't duplicate clicks from the same IP within 100ms
        deduplication: {
          id: `${code}:${req.ip}:${Math.floor(Date.now() / 100)}`,
        },
      }
    ).catch(() => {
      // Silently ignore queue errors — never block the redirect
    });
  } catch {
    // Silently ignore — click capture must never block the redirect
  }
}

// ---- GET /:code ----
// Cache-first redirect: Redis → MongoDB fallback → 404
// After successful redirect, enqueues a click event asynchronously.
router.get('/:code', redirectLimiter, async (req, res, next) => {
  const { code } = req.params;

  try {
    // 1. Try Redis cache first (this is the <30ms path)
    const cachedUrl = await getCachedUrl(code);
    if (cachedUrl) {
      req.log.info({ shortCode: code, source: 'cache' }, 'Redirect from cache');
      enqueueClickEvent(code, req); // Fire-and-forget
      return res.redirect(302, cachedUrl);
    }

    // 2. Cache miss: query MongoDB
    const urlDoc = await Url.findOne({ shortCode: code }).lean();

    if (!urlDoc) {
      return res.status(404).json({
        success: false,
        message: 'Short URL not found.',
      });
    }

    // 3. Check expiration
    if (urlDoc.expiresAt && urlDoc.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'This short URL has expired.',
      });
    }

    // 4. Warm Redis cache for subsequent requests
    const cacheTtl = urlDoc.expiresAt
      ? Math.max(0, Math.floor((urlDoc.expiresAt - Date.now()) / 1000))
      : undefined;
    await setCachedUrl(code, urlDoc.originalUrl, cacheTtl);

    req.log.info({ shortCode: code, source: 'mongo' }, 'Redirect from MongoDB');
    enqueueClickEvent(code, req); // Fire-and-forget
    res.redirect(302, urlDoc.originalUrl);
  } catch (err) {
    next(err);
  }
});

module.exports = router;