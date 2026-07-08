require('dotenv').config();

const express = require('express');
const app = express();

app.set('trust proxy', 1);

// Create a simple status route
app.get('/api/ready', (req, res) => {
  res.json({ 
    message: 'Backend is successfully connected!',
    hostname: process.env.HOSTNAME
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 Catch All
app.all('*path', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.originalUrl} on this server`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {

  console.error('GLOBAL ERROR HANDLER TRIGGERED:', err.stack);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;