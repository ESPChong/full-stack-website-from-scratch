require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const pino = require('pino');

const app = express();
app.set('trust proxy', 1);  // Allow nginx as reverse proxy

app.use(helmet());  // Security Middleware (Helmet)
app.use(express.json());


// PINO Logger Config
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // For readability in terminal
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty', options: { colorize: true } } 
    : undefined
});

app.use(pinoHttp({ logger }));  // For use in routes


// CORS Middleware
const allowedOrigins = process.env.CORS_ORIGIN || '';

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow requests with no origin

    if (allowedOrigins.split(',').includes(origin)) {
      return callback(null, true); // Origin is in the allow-list
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false); // Origin is blocked
    }
  },
  credentials: true 
};

app.use(cors(corsOptions));


// -------------------- ROUTES --------------------

// Create a simple status route
app.get('/api/ready', (req, res) => {
  req.log.info('Status Endpoint was hit');
  res.json({ 
    message: 'Backend is successfully connected!',
    hostname: process.env.HOSTNAME
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  req.log.info('Healthcheck endpoint was hit');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 Catch All
app.all('*path', (req, res) => {
  req.log.info('404 Error endpoint was hit');
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.originalUrl} on this server`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {

  console.error('GLOBAL ERROR HANDLER TRIGGERED:', err.stack);

  const statusCode = err.statusCode || 500;

  try {
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } catch (sendError) {
    next(sendError);
  }
});

module.exports = app;