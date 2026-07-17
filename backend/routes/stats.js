const express = require('express');
const Click = require('../models/Click');
const Url = require('../models/Url');

const router = express.Router();

/**
 * GET /api/urls/:code/stats/overview
 * Returns: totalClicks, uniqueIPs, last7days, last30days
 */
router.get('/:code/stats/overview', async (req, res, next) => {
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

    res.json({
      success: true,
      data: {
        totalClicks,
        uniqueIPs,
        last7Days,
        last30Days,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/urls/:code/stats/timeseries?range=7d|30d
 * Returns clicks grouped by hour (7d) or day (30d)
 */
router.get('/:code/stats/timeseries', async (req, res, next) => {
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

    res.json({
      success: true,
      data: data.map((d) => ({ time: d._id, count: d.count })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/urls/:code/stats/geo
 * Returns top countries
 */
router.get('/:code/stats/geo', async (req, res, next) => {
  try {
    const { code } = req.params;

    const data = await Click.aggregate([
      { $match: { shortCode: code, country: { $ne: null } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({
      success: true,
      data: data.map((d) => ({ country: d._id, count: d.count })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/urls/:code/stats/devices
 * Returns device type / browser / OS breakdown
 */
router.get('/:code/stats/devices', async (req, res, next) => {
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
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Click.aggregate([
        { $match: { shortCode: code, os: { $ne: null } } },
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        deviceTypes: deviceTypes.map((d) => ({ type: d._id, count: d.count })),
        browsers: browsers.map((d) => ({ name: d._id, count: d.count })),
        oss: oss.map((d) => ({ name: d._id, count: d.count })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/urls/:code/stats/referrers
 * Returns top referrers
 */
router.get('/:code/stats/referrers', async (req, res, next) => {
  try {
    const { code } = req.params;

    const data = await Click.aggregate([
      { $match: { shortCode: code, referrer: { $ne: null } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: data.map((d) => ({ referrer: d._id, count: d.count })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
