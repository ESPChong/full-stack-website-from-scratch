const { z } = require('zod');

/**
 * Validates the POST /api/urls request body.
 * - url: must be a valid URL (http/https)
 * - customCode: optional, 4-12 chars, alphanumeric + -_
 * - expiresInDays: optional, 1-365 days
 */
const createUrlSchema = z.object({
  url: z.string().url().min(1).max(2048).describe('The original URL to shorten'),
  customCode: z
    .string()
    .min(4)
    .max(12)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .describe('Optional custom short code (4-12 chars, alphanumeric + -_)'),
  expiresInDays: z
    .number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .describe('Optional expiration in days (1-365)'),
});

module.exports = { createUrlSchema };