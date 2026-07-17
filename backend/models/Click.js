const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  ip: {
    type: String,
    default: null,
  },
  country: {
    type: String,
    default: null,
  },
  region: {
    type: String,
    default: null,
  },
  city: {
    type: String,
    default: null,
  },
  deviceType: {
    type: String,
    default: null, // 'mobile' | 'tablet' | 'desktop' | 'bot'
  },
  browser: {
    type: String,
    default: null,
  },
  os: {
    type: String,
    default: null,
  },
  referrer: {
    type: String,
    default: null,
  },
});

// Primary query pattern: get all clicks for a shortCode, newest first
clickSchema.index({ shortCode: 1, timestamp: -1 });

// Geo analytics: clicks by country for a shortCode
clickSchema.index({ shortCode: 1, country: 1 });

module.exports = mongoose.model('Click', clickSchema);
