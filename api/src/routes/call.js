const express = require('express');
const { param, query } = require('express-validator');
const CallController = require('../controllers/callController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Validation middleware
const validateBuildingId = [
  param('buildingId').isMongoId().withMessage('Invalid building ID')
];

const validateResidentId = [
  param('buildingId').isMongoId().withMessage('Invalid building ID'),
  param('residentId').isMongoId().withMessage('Invalid resident ID')
];

const validateVisitId = [
  param('buildingId').isMongoId().withMessage('Invalid building ID'),
  param('visitId').isMongoId().withMessage('Invalid visit ID')
];

const validateFlatNumber = [
  param('buildingId').isMongoId().withMessage('Invalid building ID'),
  param('flatNumber').notEmpty().withMessage('Flat number is required')
];

const validateSearchQuery = [
  param('buildingId').isMongoId().withMessage('Invalid building ID'),
  query('query').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

/**
 * Call Routes
 * Handles calling residents and visitor-related communication
 */

/**
 * @route   GET /api/calls/resident/:buildingId/:residentId
 * @desc    Get resident contact information
 * @access  Private (Security, Building Admin, Super Admin)
 */
router.get('/resident/:buildingId/:residentId',
  validateResidentId,
  buildingAccess,
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  CallController.getResidentContact
);

/**
 * @route   GET /api/calls/resident-by-flat/:buildingId/:flatNumber
 * @desc    Get resident by flat number
 * @access  Private (Security, Building Admin, Super Admin)
 */
router.get('/resident-by-flat/:buildingId/:flatNumber',
  validateFlatNumber,
  buildingAccess,
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  CallController.getResidentByFlat
);

/**
 * @route   GET /api/calls/visitor-host/:buildingId/:visitId
 * @desc    Get visitor's host contact information
 * @access  Private (Security, Building Admin, Super Admin)
 */
router.get('/visitor-host/:buildingId/:visitId',
  validateVisitId,
  buildingAccess,
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  CallController.getVisitorHostContact
);

/**
 * @route   GET /api/calls/search-residents/:buildingId
 * @desc    Search residents by name or flat number
 * @access  Private (Security, Building Admin, Super Admin)
 */
router.get('/search-residents/:buildingId',
  validateSearchQuery,
  buildingAccess,
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  CallController.searchResidents
);

/**
 * @route   GET /api/calls/building-admin/:buildingId
 * @desc    Get building admin contact
 * @access  Private (Security, Building Admin, Super Admin)
 */
router.get('/building-admin/:buildingId',
  validateBuildingId,
  buildingAccess,
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  CallController.getBuildingAdminContact
);

module.exports = router;
