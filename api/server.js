const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import database connection
const databaseConnection = require('./src/config/database');

// Import routes
const authRoutes = require('./src/routes/auth');
const buildingRoutes = require('./src/routes/building');
const visitorRoutes = require('./src/routes/visitor');
const visitRoutes = require('./src/routes/visit');
const notificationRoutes = require('./src/routes/notification');
const photoRoutes = require('./src/routes/photo');
const analyticsRoutes = require('./src/routes/analytics');
const familyMemberRoutes = require('./src/routes/familyMember');
const vehicleRoutes = require('./src/routes/vehicle');
const complaintRoutes = require('./src/routes/complaint');
const helpSupportRoutes = require('./src/routes/helpSupport');
const faqRoutes = require('./src/routes/faq');
const flatRoutes = require('./src/routes/flat');
const househelpRoutes = require('./src/routes/househelp');
const preApprovalRoutes = require('./src/routes/preApproval');
// NEW ROUTES - Figma Required
const visitorCategoryRoutes = require('./src/routes/visitorCategory');
const securityDashboardRoutes = require('./src/routes/securityDashboard');
const callRoutes = require('./src/routes/call');
// ADMIN FLOW ROUTES - New Implementation
const employeeRoutes = require('./src/routes/employee');
const residentApprovalRoutes = require('./src/routes/residentApproval');
const adminDashboardRoutes = require('./src/routes/adminDashboard');
const messageRoutes = require('./src/routes/message');

// Initialize Express app
const app = express();

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter); // Apply to all API routes

// Other middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// ROUTES
// ========================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// Database health check endpoint
app.get('/db-health', async (req, res) => {
  try {
    const dbStatus = await databaseConnection.healthCheck();
    res.status(200).json({
      success: true,
      endpoint: '/db-health',
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      endpoint: '/db-health',
      timestamp: new Date().toISOString(),
      error: 'Database health check failed',
      message: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/family-members', familyMemberRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/help-support', helpSupportRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/flats', flatRoutes);
app.use('/api/househelp', househelpRoutes);
app.use('/api/pre-approvals', preApprovalRoutes);
// NEW ROUTES - Figma Required
app.use('/api/visitor-categories', visitorCategoryRoutes);
app.use('/api/security', securityDashboardRoutes);
app.use('/api/calls', callRoutes);
// ADMIN FLOW ROUTES - New Implementation
app.use('/api/employees', employeeRoutes);
app.use('/api/resident-approvals', residentApprovalRoutes);
app.use('/api/admin-dashboard', adminDashboardRoutes);
app.use('/api/messages', messageRoutes);

// API base endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Visitor Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
          endpoints: {
        health: `${BASE_URL}/health`,
        database: `${BASE_URL}/db-health`,
        authentication: `${BASE_URL}/api/auth`,
        buildings: `${BASE_URL}/api/buildings`,
        visitors: `${BASE_URL}/api/visitors`,
        visits: `${BASE_URL}/api/visits`,
        notifications: `${BASE_URL}/api/notifications`,
        photos: `${BASE_URL}/api/photos`,
        analytics: `${BASE_URL}/api/analytics`,
        familyMembers: `${BASE_URL}/api/family-members`,
        vehicles: `${BASE_URL}/api/vehicles`,
        flats: `${BASE_URL}/api/flats`,
        househelp: `${BASE_URL}/api/househelp`,
        preApprovals: `${BASE_URL}/api/pre-approvals`,
        complaints: `${BASE_URL}/api/complaints`,
        helpSupport: `${BASE_URL}/api/help-support`,
        faqs: `${BASE_URL}/api/faqs`,
        // NEW ADMIN FLOW ENDPOINTS
        employees: `${BASE_URL}/api/employees`,
        residentApprovals: `${BASE_URL}/api/resident-approvals`,
        adminDashboard: `${BASE_URL}/api/admin-dashboard`,
        messages: `${BASE_URL}/api/messages`,
        visitorCategories: `${BASE_URL}/api/visitor-categories`,
        securityDashboard: `${BASE_URL}/api/security`,
        calls: `${BASE_URL}/api/calls`,
        documentation: `${BASE_URL}/api/docs`
      },
    environment: NODE_ENV
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 Visitor Management System API',
    description: 'Secure, scalable visitor management with 4-tier role system',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Running',
    environment: NODE_ENV,
          quickStart: {
        health: `${BASE_URL}/health`,
        api: `${BASE_URL}/api`,
        auth: `${BASE_URL}/api/auth`,
        buildings: `${BASE_URL}/api/buildings`,
        visitors: `${BASE_URL}/api/visitors`,
        visits: `${BASE_URL}/api/visits`,
        notifications: `${BASE_URL}/api/notifications`,
        photos: `${BASE_URL}/api/photos`,
        analytics: `${BASE_URL}/api/analytics`
      },
    features: [
      '4-Tier Role System (Super Admin → Building Admin → Security → Resident)',
      'OTP-based Authentication',
      'Multi-building Support',
      'Real-time Notifications',
      'QR Code Visitor Management',
      'Photo Verification System'
    ]
  });
});

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
          availableEndpoints: {
        root: '/',
        health: '/health',
        database: '/db-health',
        api: '/api',
        auth: '/api/auth',
        buildings: '/api/buildings',
        visitors: '/api/visitors',
        visits: '/api/visits',
        notifications: '/api/notifications',
        photos: '/api/photos',
        analytics: '/api/analytics'
      }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ========================================
// START SERVER WITH DATABASE CONNECTION
// ========================================

async function startServer() {
  try {
    // Connect to MongoDB Atlas
    await databaseConnection.connect();

    // Start Express server
    app.listen(PORT, () => {
      const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

      console.log('🚀 Visitor Management System API');
      console.log('================================');
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔌 Port: ${PORT}`);
      console.log(`🔗 Health Check: ${baseUrl}/health`);
      console.log(`📊 Database Health: ${baseUrl}/db-health`);
      console.log(`🔐 Authentication: ${baseUrl}/api/auth`);
      console.log(`🏢 Buildings: ${baseUrl}/api/buildings`);
      console.log(`📚 API Base: ${baseUrl}/api`);
      console.log(`🌐 Base URL: ${baseUrl}`);
      console.log('================================');
      console.log('✅ Server is running successfully!');
      console.log('✅ MongoDB Atlas connected successfully!');
      console.log('✅ Authentication system ready!');
      console.log('✅ Building management system ready!');
      console.log('✅ 4-Tier role system active!');
      console.log('================================');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('💡 Please check your MongoDB Atlas connection string in .env file');
    process.exit(1);
  }
}

// Start the server
startServer();
"// Trigger deployment for forgot password routes" 
