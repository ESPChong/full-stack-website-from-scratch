require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const pino = require('pino');

const app = express();
app.set('trust proxy', 1);  // Allow nginx as reverse proxy

// Request ID middleware — correlates logs across services
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(helmet());  // Security Middleware (Helmet)
app.use(express.json());


// PINO Logger Config
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // For readability in terminal
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty', options: { colorize: true } } 
    : undefined
});

app.use(pinoHttp({ logger }));  // For use in routes


// CORS Middleware
const allowedOrigins = process.env.CORS_ORIGIN || '';
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow requests with no origin

    if (process.env.NODE_ENV === 'development') return callback(null, true);

    if (allowedOrigins.split(',').includes(origin)) {
      return callback(null, true); // Origin is in the allow-list
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false); // Origin is blocked
    }
  },
  credentials: true 
};

app.use(cors(corsOptions));


// -------------------- ROUTES --------------------

const Click = require('./models/Click');
const urlsRouter = require('./routes/urls');
const redirectRouter = require('./routes/redirect');

// Health / Status
app.get('/api/ready', (req, res) => {
  req.log.info('Status Endpoint was hit');
  res.json({ message: 'Backend is successfully connected!', hostname: process.env.HOSTNAME });
});
app.get('/api/health', (req, res) => {
  req.log.info('Healthcheck endpoint was hit');
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ---- Stats analytics (inline, before /api/urls router to win on route matching) ----

app.get('/api/urls/:code/stats/overview', async (req, res, next) => {
  try {
    const { code } = req.params;
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const [totalClicks, uniqueIPs, last7Days, last30Days] = await Promise.all([
      Click.countDocuments({ shortCode: code }),
      Click.distinct('ip', { shortCode: code }).then((ips) => ips.length),
      Click.countDocuments({ shortCode: code, timestamp: { $gte: sevenDaysAgo } }),
      Click.countDocuments({ shortCode: code, timestamp: { $gte: thirtyDaysAgo } }),
    ]);
    res.json({ success: true, data: { totalClicks, uniqueIPs, last7Days, last30Days } });
  } catch (err) { next(err); }
});

app.get('/api/urls/:code/stats/timeseries', async (req, res, next) => {
  try {
    const { code } = req.params;
    const range = req.query.range || '7d';
    const now = new Date();
    const days = range === '30d' ? 30 : 7;
    const since = new Date(now - days * 24 * 60 * 60 * 1000);
    const groupBy = range === '30d'
      ? { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
      : { $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$timestamp' } };
    const data = await Click.aggregate([
      { $match: { shortCode: code, timestamp: { $gte: since } } },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data: data.map((d) => ({ time: d._id, count: d.count })) });
  } catch (err) { next(err); }
});

app.get('/api/urls/:code/stats/geo', async (req, res, next) => {
  try {
    const { code } = req.params;
    const data = await Click.aggregate([
      { $match: { shortCode: code, country: { $ne: null } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]);
    res.json({ success: true, data: data.map((d) => ({ country: d._id, count: d.count })) });
  } catch (err) { next(err); }
});

app.get('/api/urls/:code/stats/devices', async (req, res, next) => {
  try {
    const { code } = req.params;
    const [deviceTypes, browsers, oss] = await Promise.all([
      Click.aggregate([
        { $match: { shortCode: code, deviceType: { $ne: null } } },
        { $group: { _id: '$deviceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Click.aggregate([
        { $match: { shortCode: code, browser: { $ne: null } } },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
      Click.aggregate([
        { $match: { shortCode: code, os: { $ne: null } } },
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
    ]);
    res.json({ success: true, data: {
      deviceTypes: deviceTypes.map((d) => ({ type: d._id, count: d.count })),
      browsers: browsers.map((d) => ({ name: d._id, count: d.count })),
      oss: oss.map((d) => ({ name: d._id, count: d.count })),
    }});
  } catch (err) { next(err); }
});

app.get('/api/urls/:code/stats/referrers', async (req, res, next) => {
  try {
    const { code } = req.params;
    const data = await Click.aggregate([
      { $match: { shortCode: code, referrer: { $ne: null } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]);
    res.json({ success: true, data: data.map((d) => ({ referrer: d._id, count: d.count })) });
  } catch (err) { next(err); }
});

// URL API routes
app.use('/api/urls', urlsRouter);

// Short code redirect (LAST — only catches unmatched paths)
app.use('/', redirectRouter);

// 404 Catch All
app.all('*path', (req, res) => {
  req.log.info('404 Error endpoint was hit');
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.originalUrl} on this server`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {

  console.error('GLOBAL ERROR HANDLER TRIGGERED:', err.stack);

  const statusCode = err.statusCode || 500;

  try {
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } catch (sendError) {
    next(sendError);
  }
});

module.exports = app;