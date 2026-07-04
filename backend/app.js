require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectMongoDB = require('./config/db');
const { connectRedis } = require('./config/redis');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Database Connections
connectMongoDB();
connectRedis();

// Create a simple status route
app.get('/api/status', (req, res) => {
  res.json({ 
    message: "Backend is successfully connected!", 
    timestamp: new Date().toISOString() 
  });
});

// Start the server
const port = process.env.PORT;
app.listen(port, () => console.log(`Server running on port http://localhost:${port}`));