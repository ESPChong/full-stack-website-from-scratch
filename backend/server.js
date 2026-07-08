const app = require('./app');
const connectMongoDB = require('./config/db');
const { connectRedis } = require('./config/redis');

// Initialize Database and Redis Connections
connectMongoDB();
connectRedis();


// Start the server
const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`Server running on port ${port}`));