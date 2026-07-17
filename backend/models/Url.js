const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    minlength: 4,
    maxlength: 12,
    match: /^[a-zA-Z0-9_-]+$/,
  },
  originalUrl: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expiresAt: {
    type: Date,
    default: null,
    index: true,
  },
});

// TTL index: MongoDB auto-deletes documents 60 seconds after expiresAt.
// This enables automatic cleanup of expired short URLs.
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60, partialFilterExpression: { expiresAt: { $type: 'date' } } });

module.exports = mongoose.model('Url', urlSchema);