const request = require('supertest');
const app = require('./app');

// --- Mock MongoDB ---
let mockMockDoc = {};
let mockShouldFail = false;
let mockUrlCountVal = 0;
const mockClicksData = [];

jest.mock('mongoose', () => {
  const original = jest.requireActual('mongoose');
  const mockModel = {
    findOne: jest.fn().mockImplementation((query) => {
      const shortCode = typeof query === 'object' ? query.shortCode : query;
      const isMatch = mockMockDoc && mockMockDoc.shortCode === shortCode;
      const result = {
        lean: () => {
          if (mockShouldFail) throw new Error('Mongo error');
          return Promise.resolve(isMatch ? mockMockDoc : null);
        },
        select: function () { return this; },
      };
      return result;
    }),
    create: jest.fn().mockImplementation((doc) => {
      if (mockShouldFail) throw new Error('Mongo write error');
      mockMockDoc = { ...doc, shortCode: doc.shortCode || 'abc123' };
      return Promise.resolve(mockMockDoc);
    }),
    countDocuments: jest.fn().mockImplementation(() => Promise.resolve(mockUrlCountVal)),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    }),
    distinct: jest.fn().mockResolvedValue(['192.168.1.1']),
    aggregate: jest.fn().mockResolvedValue([]),

    __setMockDoc: (d) => { mockMockDoc = d; },
    __setFail: (f) => { mockShouldFail = f; },
    __setCount: (c) => { mockUrlCountVal = c; },
  };

  return {
    ...original,
    connect: jest.fn().mockResolvedValue(true),
    model: jest.fn().mockReturnValue(mockModel),
    connection: { readyState: 1, close: jest.fn().mockResolvedValue(true) },
  };
});

// --- Mock Redis ---
const redisStore = {};
jest.mock('./config/redis', () => ({
  redisClient: {
    get: jest.fn().mockImplementation(async (key) => {
      const code = key.replace('url:', '');
      return redisStore[code] || null;
    }),
    set: jest.fn().mockImplementation(async (key, val, opts) => {
      const code = key.replace('url:', '');
      redisStore[code] = val;
      return 'OK';
    }),
    del: jest.fn().mockImplementation(async (key) => {
      const code = key.replace('url:', '');
      delete redisStore[code];
      return 1;
    }),
    isOpen: true,
    quit: jest.fn().mockResolvedValue(true),
  },
  connectRedis: jest.fn().mockResolvedValue(true),
}));

// --- Helpers ---
const Url = require('mongoose').model();

function warmRedis(shortCode, originalUrl) {
  redisStore[shortCode] = originalUrl;
}

function clearRedis() {
  Object.keys(redisStore).forEach((k) => delete redisStore[k]);
}

// --- Tests ---
describe('GET /api/ready', () => {
  it('should return 200 with a message', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Backend is successfully connected!');
  });
});

describe('GET /api/health', () => {
  it('should return 200 with healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

// --- Unit tests for Zod validation ---
describe('Zod schema validation (unit)', () => {
  const { createUrlSchema } = require('./validators/urlValidator');

  it('should accept a valid URL', () => {
    const result = createUrlSchema.safeParse({ url: 'https://example.com' });
    expect(result.success).toBe(true);
  });

  it('should reject an invalid URL', () => {
    const result = createUrlSchema.safeParse({ url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('should accept optional customCode and expiresInDays', () => {
    const result = createUrlSchema.safeParse({
      url: 'https://example.com',
      customCode: 'mycode',
      expiresInDays: 30,
    });
    expect(result.success).toBe(true);
    expect(result.data.customCode).toBe('mycode');
    expect(result.data.expiresInDays).toBe(30);
  });

  it('should reject customCode shorter than 4 chars', () => {
    const result = createUrlSchema.safeParse({
      url: 'https://example.com',
      customCode: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('should reject customCode with invalid characters', () => {
    const result = createUrlSchema.safeParse({
      url: 'https://example.com',
      customCode: 'my code!',
    });
    expect(result.success).toBe(false);
  });

  it('should reject expiresInDays > 365', () => {
    const result = createUrlSchema.safeParse({
      url: 'https://example.com',
      expiresInDays: 400,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty URL', () => {
    const result = createUrlSchema.safeParse({ url: '' });
    expect(result.success).toBe(false);
  });
});

// --- Unit tests for nanoid generation ---
describe('nanoid generation (unit)', () => {
  const { nanoid } = require('nanoid');

  it('should generate a 6-character nanoid', () => {
    const id = nanoid(6);
    expect(id).toHaveLength(6);
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(nanoid(6));
    }
    expect(ids.size).toBe(100);
  });
});

// --- Integration: POST /api/urls → GET /:code → 404 ---
describe('Integration: create → redirect → 404', () => {
  const UrlModel = require('mongoose').model();

  beforeEach(() => {
    clearRedis();
    UrlModel.__setMockDoc(null);
    UrlModel.__setFail(false);
    UrlModel.__setCount(0);
  });

  it('should create a short URL and redirect', async () => {
    // 1. Create
    const createRes = await request(app)
      .post('/api/urls')
      .send({ url: 'https://example.com/test' });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.shortCode).toBeDefined();
    expect(createRes.body.data.shortCode).toHaveLength(6);

    const shortCode = createRes.body.data.shortCode;

    // Set up the mock so the redirect can find it
    UrlModel.__setMockDoc({
      shortCode,
      originalUrl: 'https://example.com/test',
      createdAt: new Date(),
      expiresAt: null,
    });

    // 2. Redirect (should go through Mongo since Redis was cleared)
    const redirectRes = await request(app)
      .get(`/${shortCode}`)
      .redirects(0); // Don't follow redirect, just inspect the 302

    expect(redirectRes.statusCode).toBe(302);
    expect(redirectRes.headers.location).toBe('https://example.com/test');
  });

  it('should redirect from Redis cache when warmed', async () => {
    warmRedis('warmkey', 'https://cached.example.com');

    const redirectRes = await request(app)
      .get('/warmkey')
      .redirects(0);

    expect(redirectRes.statusCode).toBe(302);
    expect(redirectRes.headers.location).toBe('https://cached.example.com');
  });

  it('should return 404 for unknown short code', async () => {
    const res = await request(app).get('/unknowncode');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 410 for expired short URL', async () => {
    UrlModel.__setMockDoc({
      shortCode: 'expired1',
      originalUrl: 'https://expired.example.com',
      createdAt: new Date(Date.now() - 86400000),
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    });

    const res = await request(app).get('/expired1');
    expect(res.statusCode).toBe(410);
    expect(res.body.message).toContain('expired');
  });

  it('should return 409 on custom code collision', async () => {
    // Pre-populate mock to simulate existing code
    UrlModel.__setMockDoc({
      shortCode: 'taken12',
      originalUrl: 'https://existing.example.com',
    });

    const res = await request(app)
      .post('/api/urls')
      .send({ url: 'https://example.com', customCode: 'taken12' });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toContain('taken');
  });

  it('should return validation error for bad input', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ url: 'not-a-url' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('should create a URL with custom code', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ url: 'https://custom.example.com', customCode: 'myxmas' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.shortCode).toBe('myxmas');
  });
});

// --- GET /api/urls paginated list ---
describe('GET /api/urls', () => {
  const UrlModel = require('mongoose').model();

  beforeEach(() => {
    UrlModel.__setCount(25);
  });

  it('should return paginated list', async () => {
    const res = await request(app).get('/api/urls?page=1&limit=10');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.total).toBe(25);
    expect(res.body.pagination.totalPages).toBe(3);
  });

  it('should handle missing query params with defaults', async () => {
    const res = await request(app).get('/api/urls');
    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(20);
  });
});

// --- GET /api/urls/:code single lookup ---
describe('GET /api/urls/:code', () => {
  const UrlModel = require('mongoose').model();

  beforeEach(() => {
    UrlModel.__setMockDoc(null);
  });

  it('should return a single URL by shortCode', async () => {
    UrlModel.__setMockDoc({
      shortCode: 'mysingle',
      originalUrl: 'https://single.example.com',
      createdAt: new Date(),
      expiresAt: null,
    });

    const res = await request(app).get('/api/urls/mysingle');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.shortCode).toBe('mysingle');
  });

  it('should return 404 for missing shortCode', async () => {
    const res = await request(app).get('/api/urls/nonexist');
    expect(res.statusCode).toBe(404);
  });
});

// --- Redirect: Mongo fallback path (not in Redis) ---
describe('Redirect: Mongo fallback', () => {
  const UrlModel = require('mongoose').model();

  beforeEach(() => {
    clearRedis();
    UrlModel.__setMockDoc(null);
    UrlModel.__setFail(false);
  });

  it('should redirect from Mongo when Redis miss', async () => {
    UrlModel.__setMockDoc({
      shortCode: 'mongocd',
      originalUrl: 'https://mongo-fallback.example.com',
      createdAt: new Date(),
      expiresAt: null,
    });

    const redirectRes = await request(app)
      .get('/mongocd')
      .redirects(0);

    expect(redirectRes.statusCode).toBe(302);
    expect(redirectRes.headers.location).toBe('https://mongo-fallback.example.com');
  });

  it('should warm Redis after Mongo lookup', async () => {
    UrlModel.__setMockDoc({
      shortCode: 'warmmngo',
      originalUrl: 'https://warm-mongo.example.com',
      createdAt: new Date(),
      expiresAt: null,
    });

    // First hit: Mongo fallback (Redis cold)
    const res1 = await request(app).get('/warmmngo').redirects(0);
    expect(res1.statusCode).toBe(302);

    // Second hit should now come from Redis cache
    const res2 = await request(app).get('/warmmngo').redirects(0);
    expect(res2.statusCode).toBe(302);
    expect(res2.headers.location).toBe('https://warm-mongo.example.com');
  });

  it('should handle MongoDB error in redirect gracefully', async () => {
    UrlModel.__setFail(true);

    const res = await request(app).get('/errorcode');
    expect(res.statusCode).toBe(500);
  });
});

// --- POST /api/urls with expiration ---
describe('POST /api/urls with expiration', () => {
  const UrlModel = require('mongoose').model();

  beforeEach(() => {
    clearRedis();
    UrlModel.__setMockDoc(null);
    UrlModel.__setFail(false);
  });

  it('should create a URL with expiresInDays', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ url: 'https://expiring.example.com', expiresInDays: 7 });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.expiresAt).toBeDefined();
  });
});

// --- 404 catch-all ---
describe('404 catch-all route', () => {
  it('should return 404 for unknown route', async () => {
    const res = await request(app).get('/some/random/path/that/does/not/exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// --- CORS in production ---
describe('CORS configuration', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should allow no-origin requests (server-to-server)', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', '');
    expect(res.statusCode).toBe(200);
  });

  it('should set CORS headers', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://example.com');
    // In development mode, all origins are allowed
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});

// --- Redis cache utility error paths ---
describe('Redis cache error handling', () => {
  const { getCachedUrl, setCachedUrl } = require('./utils/urlCache');

  it('getCachedUrl should return null on Redis error', async () => {
    // Mock Redis.get to throw
    const redisModule = require('./config/redis');
    const originalGet = redisModule.redisClient.get;
    redisModule.redisClient.get = jest.fn().mockRejectedValue(new Error('Redis down'));
    
    const result = await getCachedUrl('anycode');
    expect(result).toBeNull();
    
    redisModule.redisClient.get = originalGet;
  });

  it('setCachedUrl should not throw on Redis error', async () => {
    const redisModule = require('./config/redis');
    const originalSet = redisModule.redisClient.set;
    redisModule.redisClient.set = jest.fn().mockRejectedValue(new Error('Redis write failed'));
    
    // Should not throw
    await expect(setCachedUrl('anycode', 'https://example.com')).resolves.toBeUndefined();
    
    redisModule.redisClient.set = originalSet;
  });
});

// --- Stats endpoints ---
const modelRef = require('mongoose').model();

describe('Stats: GET /api/urls/:code/stats/overview', () => {
  beforeEach(() => {
    modelRef.__setFail(false);
    modelRef.countDocuments.mockResolvedValue(10);
    modelRef.distinct.mockResolvedValue(['ip1', 'ip2']);
  });

  it('should return overview stats', async () => {
    const res = await request(app).get('/api/urls/test1/stats/overview');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalClicks).toBe(10);
    expect(res.body.data.uniqueIPs).toBe(2);
  });

  it('should handle errors gracefully', async () => {
    modelRef.countDocuments.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/urls/testerr/stats/overview');
    expect(res.statusCode).toBe(500);
  });
});

describe('Stats: GET /api/urls/:code/stats/timeseries', () => {
  it('should return timeseries data', async () => {
    modelRef.aggregate.mockResolvedValue([
      { _id: '2026-07-17T08:00:00Z', count: 5 },
    ]);
    const res = await request(app).get('/api/urls/test1/stats/timeseries?range=7d');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].count).toBe(5);
  });

  it('should default to 7d range', async () => {
    modelRef.aggregate.mockResolvedValue([]);
    const res = await request(app).get('/api/urls/test1/stats/timeseries');
    expect(res.statusCode).toBe(200);
  });

  it('should handle 30d range', async () => {
    modelRef.aggregate.mockResolvedValue([]);
    const res = await request(app).get('/api/urls/test1/stats/timeseries?range=30d');
    expect(res.statusCode).toBe(200);
  });
});

describe('Stats: GET /api/urls/:code/stats/geo', () => {
  it('should return geo data', async () => {
    modelRef.aggregate.mockResolvedValue([{ _id: 'US', count: 3 }]);
    const res = await request(app).get('/api/urls/test1/stats/geo');
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].country).toBe('US');
  });
});

describe('Stats: GET /api/urls/:code/stats/devices', () => {
  it('should return device breakdown', async () => {
    modelRef.aggregate
      .mockResolvedValueOnce([{ _id: 'desktop', count: 7 }])
      .mockResolvedValueOnce([{ _id: 'Chrome', count: 5 }])
      .mockResolvedValueOnce([{ _id: 'macOS', count: 8 }]);
    const res = await request(app).get('/api/urls/test1/stats/devices');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.deviceTypes[0].type).toBe('desktop');
    expect(res.body.data.browsers[0].name).toBe('Chrome');
    expect(res.body.data.oss[0].name).toBe('macOS');
  });

  it('should handle errors', async () => {
    modelRef.aggregate.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/urls/test1/stats/devices');
    expect(res.statusCode).toBe(500);
  });
});

describe('Stats: GET /api/urls/:code/stats/referrers', () => {
  it('should return referrer data', async () => {
    modelRef.aggregate.mockResolvedValue([{ _id: 'https://google.com', count: 4 }]);
    const res = await request(app).get('/api/urls/test1/stats/referrers');
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].referrer).toBe('https://google.com');
  });

  it('should handle empty data', async () => {
    modelRef.aggregate.mockResolvedValue([]);
    const res = await request(app).get('/api/urls/test1/stats/referrers');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// --- Request ID middleware ---
describe('Request ID middleware', () => {
  it('should set X-Request-Id header on responses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('should accept forwarded X-Request-Id', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', 'my-custom-id-123');
    expect(res.headers['x-request-id']).toBe('my-custom-id-123');
  });
});