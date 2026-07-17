const express = require('express');
const { nanoid } = require('nanoid');
const Url = require('../models/Url');
const { createUrlSchema } = require('../validators/urlValidator');
const { getCachedUrl, setCachedUrl, invalidateCachedUrl } = require('../utils/urlCache');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// ---- Rate limiters ----
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 URLs per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many URLs created. Please try again later.',
  },
});

const listLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

// ---- POST /api/urls ----
// Create a new short URL
router.post('/', createLimiter, async (req, res, next) => {
  try {
    // Validate request body with zod
    const parsed = createUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: parsed.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { url, customCode, expiresInDays } = parsed.data;

    // Generate short code: use custom if provided, otherwise nanoid(6)
    const shortCode = customCode || nanoid(6);

    // Check for collision (custom code or nanoid unlucky collision)
    const existing = await Url.findOne({ shortCode }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Short code "${shortCode}" is already taken. Try another.`,
      });
    }

    // Build document
    const urlDoc = {
      shortCode,
      originalUrl: url,
    };

    if (expiresInDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      urlDoc.expiresAt = expiresAt;

      // Cache TTL matches expiration (or default 24h)
      const cacheTtl = Math.min(expiresInDays * 24 * 60 * 60, 24 * 60 * 60 * 7);
      await setCachedUrl(shortCode, url, cacheTtl);
    } else {
      // Warm Redis cache with default 24h TTL
      await setCachedUrl(shortCode, url);
    }

    const created = await Url.create(urlDoc);

    req.log.info({ shortCode, originalUrl: url }, 'Short URL created');

    res.status(201).json({
      success: true,
      data: {
        shortCode: created.shortCode,
        originalUrl: created.originalUrl,
        shortUrl: `${shortCode}`,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/urls ----
// Paginated list of recent short URLs
router.get('/', listLimiter, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const skip = (page - 1) * limit;

    const [urls, total] = await Promise.all([
      Url.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('shortCode originalUrl createdAt expiresAt -_id')
        .lean(),
      Url.countDocuments(),
    ]);

    res.json({
      success: true,
      data: urls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---- GET /api/urls/:code ----
// Get details for a specific short URL
router.get('/:code', async (req, res, next) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.code })
      .select('shortCode originalUrl createdAt expiresAt -_id')
      .lean();

    if (!url) {
      return res.status(404).json({
        success: false,
        message: 'Short URL not found.',
      });
    }

    res.json({ success: true, data: url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;