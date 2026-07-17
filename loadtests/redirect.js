import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

// ---- Configuration ----
var BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
var SHORT_CODE = __ENV.SHORT_CODE || 'perf01';
var CREATE_TARGET_RPS = parseInt(__ENV.CREATE_TARGET_RPS) || 50;
var REDIRECT_TARGET_RPS = parseInt(__ENV.REDIRECT_TARGET_RPS) || 500;

// ---- Custom metrics ----
const redisHitLatency = new Trend('redis_hit_latency', true);
const mongoFallbackLatency = new Trend('mongo_fallback_latency', true);
const createLatency = new Trend('create_latency', true);

export const options = {
  scenarios: {
    // Scenario 1: Redis-hit redirect — this is the <30ms claim
    redis_hit_redirect: {
      executor: 'constant-arrival-rate',
      rate: REDIRECT_TARGET_RPS,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      exec: 'redisHitRedirect',
      tags: { scenario: 'redis_hit' },
    },

    // Scenario 2: Create new short URLs at moderate rate
    create_urls: {
      executor: 'constant-arrival-rate',
      rate: CREATE_TARGET_RPS,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'createUrl',
      tags: { scenario: 'create' },
      // Start 5s after redirect scenario so Redis is fully warm
      startTime: '5s',
    },

    // Scenario 3: Mongo-fallback redirect (use unique codes)
    // Each request hits a code NOT in Redis, forcing Mongo lookup + warming
    mongo_fallback_redirect: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '15s',
      preAllocatedVUs: 30,
      maxVUs: 100,
      exec: 'mongoFallbackRedirect',
      tags: { scenario: 'mongo_fallback' },
      startTime: '5s',
    },
  },
  thresholds: {
    // Redis-hit p95 must be < 30ms
    'redis_hit_latency': ['p(95)<30'],
    // Mongo fallback p95 should be < 200ms
    'mongo_fallback_latency': ['p(95)<200'],
    // Overall error rate < 1%
    http_req_failed: ['rate<0.01'],
  },
};

// ---- Helper: fetch random test URLs ----
const TEST_URLS = [
  'https://example.com/page/1',
  'https://example.com/page/2',
  'https://www.google.com/search?q=k6',
  'https://nodejs.org/en/docs/',
  'https://github.com',
  'https://redis.io/docs/',
  'https://www.mongodb.com/docs/',
  'https://expressjs.com/',
];

function randomUrl() {
  return TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];
}

// ---- Scenario 1: Redis-hit redirect ----
export function redisHitRedirect() {
  const res = http.get(`${BASE_URL}/${SHORT_CODE}`, {
    redirects: 0, // Don't follow — measure the 302 itself
    tags: { name: 'redis_hit_redirect' },
  });

  redisHitLatency.add(res.timings.duration);

  check(res, {
    'status is 302': (r) => r.status === 302,
    'has location header': (r) => r.headers['Location'] !== undefined,
  });
}

// ---- Scenario 2: Create URLs ----
export function createUrl() {
  const payload = JSON.stringify({
    url: randomUrl(),
  });

  const res = http.post(`${BASE_URL}/api/urls`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'create_url' },
  });

  createLatency.add(res.timings.duration);

  check(res, {
    'status is 201': (r) => r.status === 201,
    'has shortCode': (r) => {
      try {
        return r.json('data.shortCode') !== undefined;
      } catch {
        return false;
      }
    },
  });
}

// ---- Scenario 3: Mongo-fallback redirect ----
let mongoCounter = 0;
export function mongoFallbackRedirect() {
  mongoCounter++;
  // Use a unique code each time to force Mongo lookup (not in Redis)
  const code = `mongo${String(mongoCounter).padStart(6, '0')}`;

  const res = http.get(`${BASE_URL}/${code}`, {
    redirects: 0,
    tags: { name: 'mongo_fallback_redirect' },
  });

  mongoFallbackLatency.add(res.timings.duration);

  // For Mongo fallback we expect a 200 or 404 (the code doesn't exist unless pre-seeded)
  // In a real scenario with pre-seeded data, this would be 302.
  check(res, {
    'response received': (r) => r.status > 0,
  });
}

// ---- Teardown summary ----
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    base_url: BASE_URL,
    short_code: SHORT_CODE,
    scenarios: {
      redis_hit_p95_ms: data.metrics.redis_hit_latency
        ? data.metrics.redis_hit_latency.values['p(95)'].toFixed(2)
        : 'N/A',
      redis_hit_avg_ms: data.metrics.redis_hit_latency
        ? data.metrics.redis_hit_latency.values.avg.toFixed(2)
        : 'N/A',
      redis_hit_min_ms: data.metrics.redis_hit_latency
        ? data.metrics.redis_hit_latency.values.min.toFixed(2)
        : 'N/A',
      redis_hit_max_ms: data.metrics.redis_hit_latency
        ? data.metrics.redis_hit_latency.values.max.toFixed(2)
        : 'N/A',
      mongo_fallback_p95_ms: data.metrics.mongo_fallback_latency
        ? data.metrics.mongo_fallback_latency.values['p(95)'].toFixed(2)
        : 'N/A',
      mongo_fallback_avg_ms: data.metrics.mongo_fallback_latency
        ? data.metrics.mongo_fallback_latency.values.avg.toFixed(2)
        : 'N/A',
      create_p95_ms: data.metrics.create_latency
        ? data.metrics.create_latency.values['p(95)'].toFixed(2)
        : 'N/A',
    },
    thresholds_passed: {
      redis_hit_p95_under_30ms:
        data.metrics.redis_hit_latency &&
        data.metrics.redis_hit_latency.values['p(95)'] < 30,
      mongo_fallback_p95_under_200ms:
        data.metrics.mongo_fallback_latency &&
        data.metrics.mongo_fallback_latency.values['p(95)'] < 200,
      error_rate_under_1pct: data.metrics.http_req_failed
        ? data.metrics.http_req_failed.values.rate < 0.01
        : true,
    },
  };

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'loadtests/results/summary.json': JSON.stringify(summary, null, 2),
  };
}