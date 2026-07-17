const app = require('./app');
const connectMongoDB = require('./config/db');
const { connectRedis } = require('./config/redis');


const port = process.env.PORT || 5001;

(async () => {
  // Initialize Database and Redis Connections
  try {
    await connectMongoDB();
    console.log('Connected to MongoDB!');

    await connectRedis();
    console.log('Connected to Redis!');
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }

  // Start server after connections are ready
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  // Graceful Shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    server.close(() => {
      console.log('HTTP server closed. No longer accepting new requests.');
    });

    try {
      // Close MongoDB Connection
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
      }

      // Close Redis Connection
      const { redisClient } = require('./config/redis');
      if (redisClient && redisClient.isOpen) {
        await redisClient.quit();  // .quit() waits for pending commands to finish. .disconnect() does not.
        console.log('Redis connection closed.');
      }

      console.log('Graceful shutdown completed successfully.');
      process.exit(0); // Exit with success code
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1); // Exit with failure code
    }
  };

  // Listen for SIGTERM (Sent by Docker)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  // Listen for SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();