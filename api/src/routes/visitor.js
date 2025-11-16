const express = require('express');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const VisitorController = require('../controllers/visitorController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateVisitorCreation = [
  // Required fields only
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  
  // New Date and Time fields (optional)
  body('Date')
    .optional()
    .matches(/^\d{2}\/\d{2}\/\d{4}$/)
    .withMessage('Date must be in dd/mm/yyyy format'),
  
  body('Time')
    .optional()
    .matches(/^\d{1,2}:\d{2}\s?(am|pm)$/i)
    .withMessage('Time must be in hh:mm am/pm format'),
  
  // All other fields are now optional
  body('idType')
    .optional()
    .isIn(['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'])
    .withMessage('Invalid ID type'),
  
  body('idNumber')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('ID number must not be empty if provided'),
  
  body('purpose')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Purpose must be between 5 and 200 characters if provided'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  
  body('vehicleNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Vehicle number cannot exceed 20 characters'),
  
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  
  body('emergencyContact.phone')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid emergency contact phone number'),
  
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relationship cannot exceed 50 characters'),
  
  // Flat Number validation (for FLAT_EMPLOYEE category)
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters'),
  
  // Visitor Category validation
  body('visitorCategory')
    .optional()
    .isIn(['CAB_DRIVER', 'DELIVERY_AGENT', 'FLAT_EMPLOYEE', 'OTHER'])
    .withMessage('Invalid visitor category'),
  
  // Service Type validation
  body('serviceType')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Service type cannot exceed 50 characters'),
  
  // Employee Code validation (for FLAT_EMPLOYEE category)
  body('employeeCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Employee code cannot exceed 20 characters'),
  
  // Vehicle Type validation
  body('vehicleType')
    .optional()
    .isIn(['CAR', 'BIKE', 'SCOOTER', 'AUTO', 'OTHER'])
    .withMessage('Invalid vehicle type')
];

const validateVisitorUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  
  body('idType')
    .optional()
    .isIn(['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'])
    .withMessage('Invalid ID type'),
  
  body('idNumber')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('ID number is required'),
  
  body('purpose')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Purpose must be between 5 and 200 characters'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  
  body('vehicleNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Vehicle number cannot exceed 20 characters'),
  
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  
  body('emergencyContact.phone')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid emergency contact phone number'),
  
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relationship cannot exceed 50 characters'),
  
  // Flat Number validation (for FLAT_EMPLOYEE category)
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters'),
  
  // Visitor Category validation
  body('visitorCategory')
    .optional()
    .isIn(['CAB_DRIVER', 'DELIVERY_AGENT', 'FLAT_EMPLOYEE', 'OTHER'])
    .withMessage('Invalid visitor category'),
  
  // Service Type validation
  body('serviceType')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Service type cannot exceed 50 characters'),
  
  // Employee Code validation (for FLAT_EMPLOYEE category)
  body('employeeCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Employee code cannot exceed 20 characters'),
  
  // Vehicle Type validation
  body('vehicleType')
    .optional()
    .isIn(['CAR', 'BIKE', 'SCOOTER', 'AUTO', 'OTHER'])
    .withMessage('Invalid vehicle type')
];

const validateParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Valid building ID is required'),
  
  param('visitorId')
    .optional()
    .isMongoId()
    .withMessage('Valid visitor ID is required')
];

const validateQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  
  query('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Blacklisted'])
    .withMessage('Invalid status value'),
  
  query('isBlacklisted')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isBlacklisted must be true or false'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'totalVisits', 'lastVisitAt'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('query')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
];

// Visitor photo upload (face + ID proof)
const visitorPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      const error = new Error('Only image files are allowed');
      error.code = 'UNSUPPORTED_FILE_TYPE';
      cb(error);
    }
  }
});

const applyVisitorPhotoUpload = (req, res, next) => {
  visitorPhotoUpload.fields([
    { name: 'facePhoto', maxCount: 1 },
    { name: 'idPhoto', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      let message = 'Failed to upload visitor photos';
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'Each photo must be 5MB or smaller';
      } else if (err.code === 'UNSUPPORTED_FILE_TYPE') {
        message = 'Only image files are allowed';
      } else if (err.message) {
        message = err.message;
      }

      return res.status(400).json({
        success: false,
        message
      });
    }
    next();
  });
};

// Routes

// POST /api/visitors/:buildingId - Create a new visitor
router.post('/:buildingId',
  validateParams,
  validateVisitorCreation,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.createVisitor
);

// GET /api/visitors/:buildingId/stats - Get visitor statistics (MUST come before :buildingId route)
router.get('/:buildingId/stats',
  validateParams,
  validateQuery,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  VisitorController.getVisitorStats
);

// Photo upload functionality removed - will be implemented separately
router.post('/:buildingId/:visitorId/photos',
  validateParams,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  applyVisitorPhotoUpload,
  VisitorController.uploadVisitorPhotos
);

// GET /api/visitors/:buildingId/search - Search visitors (MUST come before :buildingId route)
router.get('/:buildingId/search',
  validateParams,
  validateQuery,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  VisitorController.searchVisitors
);

// GET /api/visitors/:buildingId - Get all visitors for a building (MUST come LAST)
router.get('/:buildingId',
  validateParams,
  validateQuery,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.getVisitors
);

// GET /api/visitors/:buildingId/:visitorId - Get visitor by ID (MUST come after search route)
router.get('/:buildingId/:visitorId',
  validateParams,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.getVisitorById
);

// PUT /api/visitors/:buildingId/:visitorId - Update visitor
router.put('/:buildingId/:visitorId',
  validateParams,
  validateVisitorUpdate,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.updateVisitor
);

// DELETE /api/visitors/:buildingId/:visitorId - Delete visitor (soft delete)
router.delete('/:buildingId/:visitorId',
  validateParams,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.deleteVisitor
);

module.exports = router;
