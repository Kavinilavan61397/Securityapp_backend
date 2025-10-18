const express = require('express');
const { body, param, query } = require('express-validator');
const MaintenanceRequestController = require('../controllers/maintenanceRequestController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const mongoose = require('mongoose');
const multer = require('multer');

const router = express.Router();

// Configure multer for file uploads (same as photo system)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validation middleware
const validateMaintenanceRequest = [
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: 600 })
    .withMessage('Description must be between 1 and 600 characters')
    .trim(),
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters')
    .trim(),
  body('flatNumber')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Flat number cannot exceed 50 characters')
    .trim()
];

const validateBuildingId = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format')
];

const validateRequestId = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format'),
  param('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .trim()
];

const validateUpdateRequest = [
  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status value'),
  body('adminNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Admin notes cannot exceed 1000 characters')
    .trim(),
  body('completionNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Completion notes cannot exceed 1000 characters')
    .trim()
];

const validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .withMessage('Invalid status value'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('today')
    .optional()
    .isBoolean()
    .withMessage('Today must be a boolean value')
];

// ========================================
// ROUTES
// ========================================

/**
 * @route   POST /api/maintenance-requests/:buildingId
 * @desc    Create a new maintenance request
 * @access  RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
 */
router.post(
  '/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateBuildingId,
  upload.single('image'), // Handle single image file upload
  validateMaintenanceRequest,
  MaintenanceRequestController.createMaintenanceRequest
);

/**
 * @route   GET /api/maintenance-requests/:buildingId
 * @desc    Get all maintenance requests for a building
 * @access  RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
 */
router.get(
  '/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateBuildingId,
  validateQueryParams,
  MaintenanceRequestController.getMaintenanceRequests
);

/**
 * @route   GET /api/maintenance-requests/:buildingId/stats
 * @desc    Get maintenance request statistics for a building
 * @access  RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
 */
router.get(
  '/:buildingId/stats',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateBuildingId,
  MaintenanceRequestController.getMaintenanceRequestStats
);

/**
 * @route   GET /api/maintenance-requests/:buildingId/:requestId
 * @desc    Get a specific maintenance request by ID
 * @access  RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
 */
router.get(
  '/:buildingId/:requestId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateRequestId,
  MaintenanceRequestController.getMaintenanceRequest
);

/**
 * @route   PUT /api/maintenance-requests/:buildingId/:requestId
 * @desc    Update maintenance request status
 * @access  RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
 */
router.put(
  '/:buildingId/:requestId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateRequestId,
  validateUpdateRequest,
  MaintenanceRequestController.updateMaintenanceRequest
);

module.exports = router;
