const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const PreApprovalController = require('../controllers/preApprovalController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateParams = (req, res, next) => {
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

// Building access middleware
const buildingAccessMiddleware = async (req, res, next) => {
  try {
    const { buildingId } = req.params;
    const user = req.user;

    // Check if user has access to this building
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (user.buildingId && user.buildingId.toString() !== buildingId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized for this building.'
      });
    }

    next();
  } catch (error) {
    console.error('Building access middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Validation rules
const validatePreApprovalCreation = [
  // Required fields
  body('visitorId')
    .isMongoId()
    .withMessage('Valid visitor ID is required'),

  body('purpose')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Purpose must be between 5 and 200 characters'),

  body('validUntil')
    .isISO8601()
    .withMessage('Valid until date must be a valid ISO date')
    .custom((value) => {
      const validUntil = new Date(value);
      const now = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1); // Max 1 year from now
      
      if (validUntil <= now) {
        throw new Error('Valid until date must be in the future');
      }
      
      if (validUntil > maxDate) {
        throw new Error('Valid until date cannot be more than 1 year in the future');
      }
      
      return true;
    }),

  // Optional fields
  body('maxUsage')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max usage must be between 1 and 100'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('isEmergencyContact')
    .optional()
    .isBoolean()
    .withMessage('Emergency contact must be a boolean value'),

  body('autoApprove')
    .optional()
    .isBoolean()
    .withMessage('Auto approve must be a boolean value'),

  body('notifyOnArrival')
    .optional()
    .isBoolean()
    .withMessage('Notify on arrival must be a boolean value'),

  body('securityNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Security notes cannot exceed 500 characters')
];

const validatePreApprovalUpdate = [
  // Optional fields for update
  body('purpose')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Purpose must be between 5 and 200 characters'),

  body('validUntil')
    .optional()
    .isISO8601()
    .withMessage('Valid until date must be a valid ISO date')
    .custom((value) => {
      const validUntil = new Date(value);
      const now = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      
      if (validUntil <= now) {
        throw new Error('Valid until date must be in the future');
      }
      
      if (validUntil > maxDate) {
        throw new Error('Valid until date cannot be more than 1 year in the future');
      }
      
      return true;
    }),

  body('maxUsage')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max usage must be between 1 and 100'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('isEmergencyContact')
    .optional()
    .isBoolean()
    .withMessage('Emergency contact must be a boolean value'),

  body('autoApprove')
    .optional()
    .isBoolean()
    .withMessage('Auto approve must be a boolean value'),

  body('notifyOnArrival')
    .optional()
    .isBoolean()
    .withMessage('Notify on arrival must be a boolean value'),

  body('securityNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Security notes cannot exceed 500 characters')
];

const validatePreApprovalRevoke = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Revoke reason cannot exceed 200 characters')
];

const validateRouteParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Valid building ID is required'),

  param('preApprovalId')
    .isMongoId()
    .withMessage('Valid pre-approval ID is required')
];

const validateBuildingIdOnly = [
  param('buildingId')
    .isMongoId()
    .withMessage('Valid building ID is required')
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

  query('status')
    .optional()
    .isIn(['ACTIVE', 'EXPIRED', 'REVOKED', 'USED'])
    .withMessage('Status must be ACTIVE, EXPIRED, REVOKED, or USED'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

// Routes

/**
 * @route   POST /api/pre-approvals/:buildingId
 * @desc    Create a new pre-approval
 * @access  Private (RESIDENT, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.post('/:buildingId',
  validateBuildingIdOnly,
  validatePreApprovalCreation,
  buildingAccessMiddleware,
  authorizeRoles(['RESIDENT', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  PreApprovalController.createPreApproval
);

/**
 * @route   GET /api/pre-approvals/:buildingId
 * @desc    Get all pre-approvals for a building
 * @access  Private (RESIDENT, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.get('/:buildingId',
  validateBuildingIdOnly,
  validateQuery,
  buildingAccessMiddleware,
  authorizeRoles(['RESIDENT', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  PreApprovalController.getPreApprovals
);

/**
 * @route   GET /api/pre-approvals/:buildingId/stats
 * @desc    Get pre-approval statistics
 * @access  Private (RESIDENT, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.get('/:buildingId/stats',
  validateBuildingIdOnly,
  buildingAccessMiddleware,
  authorizeRoles(['RESIDENT', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  PreApprovalController.getPreApprovalStats
);

/**
 * @route   GET /api/pre-approvals/:buildingId/search
 * @desc    Search pre-approvals
 * @access  Private (RESIDENT, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.get('/:buildingId/search',
  validateBuildingIdOnly,
  validateQuery,
  buildingAccessMiddleware,
  authorizeRoles(['RESIDENT', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  PreApprovalController.searchPreApprovals
);

/**
 * @route   GET /api/pre-approvals/:buildingId/:preApprovalId
 * @desc    Get pre-approval by ID
 * @access  Private (RESIDENT, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.get('/:buildingId/:preApprovalId',
  validateRouteParams,
  buildingAccessMiddleware,
  authorizeRoles(['RESIDENT', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  PreApprovalController.getPreApprovalById
);

/**
 * @route   PUT /api/pre-approvals/:buildingId/:preApprovalId
 * @desc    Update pre-approval
 * @access  Private (RESIDENT, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.put('/:buildingId/:preApprovalId',
  validateRouteParams,
  validatePreApprovalUpdate,
  buildingAccessMiddleware,
  authorizeRoles(['RESIDENT', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  PreApprovalController.updatePreApproval
);

/**
 * @route   DELETE /api/pre-approvals/:buildingId/:preApprovalId
 * @desc    Revoke pre-approval
 * @access  Private (RESIDENT, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.delete('/:buildingId/:preApprovalId',
  validateRouteParams,
  validatePreApprovalRevoke,
  buildingAccessMiddleware,
  authorizeRoles(['RESIDENT', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  PreApprovalController.revokePreApproval
);

/**
 * @route   POST /api/pre-approvals/:buildingId/:preApprovalId/use
 * @desc    Use pre-approval (increment usage)
 * @access  Private (SECURITY, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.post('/:buildingId/:preApprovalId/use',
  validateRouteParams,
  buildingAccessMiddleware,
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  PreApprovalController.usePreApproval
);

module.exports = router;
