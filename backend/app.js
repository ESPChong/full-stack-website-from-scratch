require('dotenv').config();

const express = require('express');
const app = express();

app.set('trust proxy', 1);

// Create a simple status route
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Backend is successfully connected!'
  });
});

// Health Check
app.get('/api/health', (req,res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;