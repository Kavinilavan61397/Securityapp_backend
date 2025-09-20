const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createPreApproval, getPreApprovals, getPreApproval, updatePreApproval, deletePreApproval } = require('../controllers/preApprovalController');

const router = express.Router();

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation middleware
const validateBuildingId = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format')
];

const validatePreApprovalId = [
  param('preApprovalId')
    .isMongoId()
    .withMessage('Invalid pre-approval ID format')
];

const validateCreatePreApproval = [
  body('visitorName')
    .notEmpty()
    .withMessage('Visitor name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Visitor name must be between 2 and 100 characters'),
  
  body('visitorPhone')
    .notEmpty()
    .withMessage('Visitor phone number is required')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 characters'),
  
  body('visitorEmail')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Purpose cannot exceed 200 characters'),
  
  body('expectedDate')
    .optional()
    .isISO8601()
    .withMessage('Expected date must be a valid date'),
  
  body('expectedTime')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Expected time cannot exceed 50 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  body('residentMobileNumber')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Resident mobile number must be between 10 and 15 characters'),
  
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters')
];

const validateUpdatePreApproval = [
  body('visitorName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Visitor name must be between 2 and 100 characters'),
  
  body('visitorPhone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 characters'),
  
  body('visitorEmail')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Purpose cannot exceed 200 characters'),
  
  body('expectedDate')
    .optional()
    .isISO8601()
    .withMessage('Expected date must be a valid date'),
  
  body('expectedTime')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Expected time cannot exceed 50 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  body('residentMobileNumber')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Resident mobile number must be between 10 and 15 characters'),
  
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters')
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
    .isIn(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'])
    .withMessage('Status must be PENDING, APPROVED, REJECTED, or EXPIRED')
];

// Routes

// POST /api/pre-approvals/:buildingId - Create a new pre-approval
router.post('/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  validateCreatePreApproval,
  handleValidationErrors,
  createPreApproval
);

// GET /api/pre-approvals/:buildingId - Get all pre-approvals for a resident
router.get('/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  validateQuery,
  handleValidationErrors,
  getPreApprovals
);

// GET /api/pre-approvals/:buildingId/:preApprovalId - Get single pre-approval
router.get('/:buildingId/:preApprovalId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  validatePreApprovalId,
  handleValidationErrors,
  getPreApproval
);

// PUT /api/pre-approvals/:buildingId/:preApprovalId - Update pre-approval
router.put('/:buildingId/:preApprovalId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  validatePreApprovalId,
  validateUpdatePreApproval,
  handleValidationErrors,
  updatePreApproval
);

// DELETE /api/pre-approvals/:buildingId/:preApprovalId - Delete pre-approval
router.delete('/:buildingId/:preApprovalId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  validatePreApprovalId,
  handleValidationErrors,
  deletePreApproval
);

// POST /api/pre-approvals/:buildingId/:preApprovalId/approve - Approve pre-approval (Admin/Security)
router.post('/:buildingId/:preApprovalId/approve',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  validateBuildingId,
  validatePreApprovalId,
  handleValidationErrors,
  (req, res) => {
    // Import the controller function dynamically to avoid circular dependencies
    const { approvePreApproval } = require('../controllers/preApprovalController');
    approvePreApproval(req, res);
  }
);

// POST /api/pre-approvals/:buildingId/:preApprovalId/reject - Reject pre-approval (Admin/Security)
router.post('/:buildingId/:preApprovalId/reject',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  validateBuildingId,
  validatePreApprovalId,
  handleValidationErrors,
  (req, res) => {
    // Import the controller function dynamically to avoid circular dependencies
    const { rejectPreApproval } = require('../controllers/preApprovalController');
    rejectPreApproval(req, res);
  }
);

module.exports = router;
