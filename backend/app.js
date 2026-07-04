require('dotenv').config();
const express = require('express');
const connectMongoDB = require('./config/db');
const { connectRedis } = require('./config/redis');

const app = express();
app.use(express.json());

// Initialize Database Connections
connectMongoDB();
connectRedis();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'All systems go!' });
});

// Start the server
// app.listen(port, () => {
//   console.log(`Server is cruising on http://localhost:${port}`);
// });

const port = process.env.PORT;
app.listen(port, () => console.log(`Server running on port ${port}`));