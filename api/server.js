const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========================================
// MIDDLEWARE SETUP
// ========================================

// Security middleware
app.use(helmet());

// CORS configuration (dynamic)
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting (only for API routes, not health check)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter); // Remove the trailing slash

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ========================================
// ROOT ENDPOINT
// ========================================
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Visitor Management System API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      root: '/',
      health: '/health',
      api: '/api',
      docs: '/api/docs'
    }
  });
});

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Visitor Management System API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// ========================================
// API ROUTES (Placeholder)
// ========================================
app.get('/api', (req, res) => {
  res.json({
    message: 'Visitor Management System API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api/docs'
    }
  });
});

// ========================================
// 404 HANDLER
// ========================================
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: ['/', '/health', '/api']
  });
});

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      message: message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  
  console.log('🚀 Visitor Management System API');
  console.log('================================');
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`🔗 Health Check: ${baseUrl}/health`);
  console.log(`📚 API Base: ${baseUrl}/api`);
  console.log(`🌐 Base URL: ${baseUrl}`);
  console.log('================================');
  console.log('✅ Server is running successfully!');
});
