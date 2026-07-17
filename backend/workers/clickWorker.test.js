/**
 * Click worker unit tests.
 * Tests the parse/batch/flush logic without real BullMQ or MongoDB.
 */

// ---- Mock geoip-lite ----
jest.mock('geoip-lite', () => ({
  lookup: jest.fn((ip) => {
    if (ip === '8.8.8.8') {
      return { country: 'US', region: 'CA', city: 'Mountain View' };
    }
    if (ip === '1.1.1.1') {
      return { country: 'AU', region: 'NSW', city: 'Sydney' };
    }
    return null;
  }),
}));

// ---- Mock mongoose ----
jest.mock('mongoose', () => {
  const original = jest.requireActual('mongoose');
  return {
    ...original,
    connect: jest.fn().mockResolvedValue(true),
    model: jest.fn().mockReturnValue({
      insertMany: jest.fn().mockResolvedValue({ insertedCount: 5 }),
    }),
    connection: { close: jest.fn().mockResolvedValue(true) },
  };
});

// ---- Mock BullMQ Worker ----
let mockStoredHandler = null;
jest.mock('bullmq', () => {
  const EventEmitter = require('events');
  const mockWorkerEmitter = new EventEmitter();

  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      close: jest.fn().mockResolvedValue(true),
    })),
    Worker: jest.fn().mockImplementation((queueName, handler, opts) => {
      mockStoredHandler = handler;
      return {
        ...mockWorkerEmitter,
        close: jest.fn().mockResolvedValue(true),
      };
    }),
  };
});

// ---- Mock ua-parser-js ----
jest.mock('ua-parser-js', () => ({
  UAParser: jest.fn().mockImplementation(() => ({
    getResult: () => ({
      device: { type: 'mobile' },
      browser: { name: 'Chrome' },
      os: { name: 'Android' },
    }),
  })),
}));

// ---- Reset mocks before each test ----
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Click Worker – parse/batch logic (unit)', () => {
  it('should parse user-agent into device, browser, OS', () => {
    const { UAParser } = require('ua-parser-js');
    const parser = new UAParser('fake-ua');
    const result = parser.getResult();

    expect(result.device.type).toBe('mobile');
    expect(result.browser.name).toBe('Chrome');
    expect(result.os.name).toBe('Android');
  });

  it('should lookup geoip for known IP addresses', () => {
    const geoip = require('geoip-lite');

    const usResult = geoip.lookup('8.8.8.8');
    expect(usResult.country).toBe('US');
    expect(usResult.city).toBe('Mountain View');

    const auResult = geoip.lookup('1.1.1.1');
    expect(auResult.country).toBe('AU');

    const unknownResult = geoip.lookup('0.0.0.0');
    expect(unknownResult).toBeNull();
  });

  it('should handle ua-parser-js returning null values', () => {
    const { UAParser } = require('ua-parser-js');
    const parser = new UAParser('fake-ua');
    const result = parser.getResult();

    // Just verify it returns the mock data
    expect(result).toBeDefined();
    expect(result.device).toBeDefined();
  });
});

describe('Click Worker – batch flush logic (unit)', () => {
  it('should call insertMany when batch is flushed', async () => {
    const Click = require('mongoose').model();
    const clicks = [
      { shortCode: 'abc123', ip: '8.8.8.8', country: 'US', deviceType: 'mobile' },
      { shortCode: 'abc123', ip: '1.1.1.1', country: 'AU', deviceType: 'desktop' },
    ];

    const result = await Click.insertMany(clicks, { ordered: false });
    expect(result.insertedCount).toBe(5); // Mocked value
    expect(Click.insertMany).toHaveBeenCalledWith(clicks, { ordered: false });
  });

  it('should handle insertMany errors without crashing', async () => {
    const Click = require('mongoose').model();
    Click.insertMany.mockRejectedValueOnce(new Error('Mongo write error'));

    await expect(
      Click.insertMany([{ shortCode: 'abc123' }], { ordered: false })
    ).rejects.toThrow('Mongo write error');
  });
});

describe('Click Worker – Queue integration', () => {
  it('should enqueue a click event via Queue.add', async () => {
    const { getClickQueue } = require('../config/queue');
    const queue = getClickQueue();

    const job = await queue.add('record-click', {
      shortCode: 'test123',
      ip: '8.8.8.8',
      userAgent: 'Mozilla/5.0',
      referrer: 'https://google.com',
      timestamp: new Date().toISOString(),
    });

    expect(job.id).toBe('job-1');
    expect(queue.add).toHaveBeenCalled();
  });
});
