const express = require('express');
const router = express.Router();

// Import only the essential middleware and models
const { authenticateToken } = require('../middleware/auth');
const Visitor = require('../models/Visitor');
const { validationResult } = require('express-validator');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Basic validation for visitor creation
const validateVisitorCreation = [
  require('express-validator').body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  require('express-validator').body('phoneNumber')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  
  require('express-validator').body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  
  require('express-validator').body('idType')
    .isIn(['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'])
    .withMessage('Please select a valid ID type'),
  
  require('express-validator').body('idNumber')
    .trim()
    .isLength({ min: 1 })
    .withMessage('ID number is required'),
  
  require('express-validator').body('purpose')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Purpose must be between 5 and 200 characters')
];

// Routes

// GET /api/visitors/:buildingId - Get all visitors for a building
router.get('/:buildingId', async (req, res) => {
  try {
    const { buildingId } = req.params;
    
    console.log('Getting visitors for building:', buildingId);

    // Simple query without complex options
    const visitors = await Visitor.find({ buildingId });
    console.log('Visitors found:', visitors.length);
    
    const totalVisitors = visitors.length;

    res.json({
      success: true,
      message: 'Visitors retrieved successfully',
      data: {
        visitors,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalVisitors,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    });

  } catch (error) {
    console.error('Error getting visitors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/visitors/:buildingId - Create a new visitor
router.post('/:buildingId', validateVisitorCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      phoneNumber,
      email,
      idType,
      idNumber,
      purpose,
      company,
      vehicleNumber,
      emergencyContact
    } = req.body;

    const { buildingId } = req.params;

    // Create visitor without photo initially
    const visitorData = {
      name,
      phoneNumber,
      email,
      idType,
      idNumber,
      purpose,
      company,
      vehicleNumber,
      emergencyContact,
      buildingId
    };

    // Remove undefined values
    Object.keys(visitorData).forEach(key => 
      visitorData[key] === undefined && delete visitorData[key]
    );

    const visitor = new Visitor(visitorData);
    await visitor.save();

    res.status(201).json({
      success: true,
      message: 'Visitor created successfully',
      data: {
        visitorId: visitor._id,
        name: visitor.name,
        phoneNumber: visitor.phoneNumber,
        email: visitor.email,
        createdAt: visitor.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating visitor:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/visitors/:buildingId/stats - Get visitor statistics
router.get('/:buildingId/stats', async (req, res) => {
  try {
    const { buildingId } = req.params;
    
    const totalVisitors = await Visitor.countDocuments({ buildingId });
    const activeVisitors = await Visitor.countDocuments({ buildingId, isActive: true });
    const blacklistedVisitors = await Visitor.countDocuments({ buildingId, isBlacklisted: true });

    res.json({
      success: true,
      message: 'Visitor statistics retrieved successfully',
      data: {
        totalVisitors,
        activeVisitors,
        blacklistedVisitors,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting visitor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
