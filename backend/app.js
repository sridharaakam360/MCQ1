const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const http = require('http');
const cookieParser = require('cookie-parser');
const asyncHandler = require('./utils/asyncHandler');
const apiResponse = require('./utils/apiResponse');
const setupWebSocket = require('./websocket');

// Routes
const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoutes');
const testRoutes = require('./routes/testRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const db = require('./config/db');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Setup WebSocket server
const io = setupWebSocket(server);

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));

// Cookie Parser
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes default
  message: 'Too many requests from this IP, please try again later!',
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Registration specific rate limit
const registrationLimiter = rateLimit({
  max: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again in an hour.',
    retryAfter: 3600 // 1 hour in seconds
  },
  skip: (req) => process.env.NODE_ENV === 'development',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts. Please try again in an hour.',
      retryAfter: 3600 // 1 hour in seconds
    });
  }
});

app.use('/api', limiter);
app.use('/api/auth/signup', registrationLimiter);

// Body parser with size limit from env
app.use(express.json({ 
  limit: process.env.UPLOAD_LIMIT || '10kb' 
}));

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Handle undefined routes
app.all('*', (req, res) => {
  return apiResponse.notFound(res, `Can't find ${req.originalUrl} on this server!`);
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  return apiResponse.error(res, {
    statusCode,
    status,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Export both app and server
module.exports = { app, server };