const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();

const passController = require('../controllers/passController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');

/**
 * Pass Routes
 * Handles visitor pass creation and management
 */

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation for building ID
const validateBuildingId = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID')
];

// Validation for creating a pass
const validateCreatePass = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address'),
  
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  
  body('reasonForVisit')
    .trim()
    .notEmpty()
    .withMessage('Reason for visit is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason for visit must be between 5 and 500 characters'),
  
  body('startingDate')
    .notEmpty()
    .withMessage('Starting date is required')
    .isISO8601()
    .withMessage('Please enter a valid starting date'),
  
  body('endingDate')
    .notEmpty()
    .withMessage('Ending date is required')
    .isISO8601()
    .withMessage('Please enter a valid ending date'),
  
  body('checkInTime')
    .trim()
    .notEmpty()
    .withMessage('Check-in time is required')
    .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i)
    .withMessage('Please enter time in HH:MM AM/PM format'),
  
  body('status')
    .optional()
    .isIn(['PENDING', 'APPROVED', 'ACTIVE', 'EXPIRED', 'CANCELLED'])
    .withMessage('Invalid status value')
];

// Validation for query parameters
const validateQuery = [
  query('status')
    .optional()
    .isIn(['PENDING', 'APPROVED', 'ACTIVE', 'EXPIRED', 'CANCELLED'])
    .withMessage('Invalid status value'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes

// Create a new visitor pass
router.post(
  '/:buildingId',
  validateBuildingId,
  validateCreatePass,
  handleValidationErrors,
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  buildingAccess,
  passController.createPass
);

// Get all passes for a building
router.get(
  '/:buildingId',
  validateBuildingId,
  validateQuery,
  handleValidationErrors,
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  buildingAccess,
  passController.getPasses
);

// Get a specific visitor pass by ID
router.get(
  '/:buildingId/:passId',
  validateBuildingId,
  handleValidationErrors,
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  buildingAccess,
  passController.getPassById
);

// Get QR code image for a specific pass
router.get(
  '/:buildingId/:passId/qr-image',
  validateBuildingId,
  handleValidationErrors,
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  buildingAccess,
  passController.getQRCodeImage
);

module.exports = router;
