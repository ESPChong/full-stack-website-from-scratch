require('dotenv').config();

const express = require('express');
const app = express();

app.set('trust proxy', 1);

// Create a simple status route
app.get('/api/status', (req, res) => {
  res.json({ 
    message: "Backend is successfully connected!" 
  });
});

module.exports = app;