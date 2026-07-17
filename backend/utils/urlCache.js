const { redisClient } = require('../config/redis');

const URL_KEY_PREFIX = 'url:';
const DEFAULT_CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Get the original URL from Redis cache by short code.
 * Returns the URL string or null on cache miss.
 */
async function getCachedUrl(shortCode) {
  try {
    return await redisClient.get(`${URL_KEY_PREFIX}${shortCode}`);
  } catch (err) {
    console.error('Redis GET error:', err.message);
    return null; // Degrade gracefully — fall through to Mongo
  }
}

/**
 * Cache an original URL in Redis with a TTL.
 * If no ttlSeconds is provided, uses the default 24h.
 */
async function setCachedUrl(shortCode, originalUrl, ttlSeconds = DEFAULT_CACHE_TTL) {
  try {
    await redisClient.set(`${URL_KEY_PREFIX}${shortCode}`, originalUrl, {
      EX: ttlSeconds,
    });
  } catch (err) {
    // Cache write failure should not block the redirect
    console.error('Redis SET error:', err.message);
  }
}

/**
 * Invalidate (delete) a cached URL from Redis.
 */
async function invalidateCachedUrl(shortCode) {
  try {
    await redisClient.del(`${URL_KEY_PREFIX}${shortCode}`);
  } catch (err) {
    console.error('Redis DEL error:', err.message);
  }
}

module.exports = { getCachedUrl, setCachedUrl, invalidateCachedUrl, URL_KEY_PREFIX, DEFAULT_CACHE_TTL };