const express = require('express');
const { body, param, query } = require('express-validator');
const familyMemberController = require('../controllers/familyMemberController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * Family Member Routes
 * Handles all family member-related API endpoints
 * Follows minimal mandatory fields approach
 */

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
const buildingAccess = async (req, res, next) => {
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
const validateFamilyMemberCreation = [
  // MANDATORY FIELDS (only 3)
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('relation')
    .isIn(['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'])
    .withMessage('Relation must be SPOUSE, CHILD, PARENT, SIBLING, or OTHER'),

  // OPTIONAL FIELDS
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('dateOfBirth')
    .optional()
    .custom((value) => {
      if (!value) return true;
      
      let date;
      if (value.includes('/')) {
        // Handle dd/mm/yyyy format
        const [day, month, year] = value.split('/');
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(value);
      }
      
      if (isNaN(date.getTime())) {
        throw new Error('Date of birth must be a valid date');
      }
      
      if (date >= new Date()) {
        throw new Error('Date of birth must be in the past');
      }
      
      return true;
    }),
  
  body('age')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be between 1 and 120'),
  
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  
  body('pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
  
  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Occupation cannot exceed 100 characters'),
  
  body('emergencyContact')
    .optional()
    .isBoolean()
    .withMessage('Emergency contact must be true or false'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateFamilyMemberUpdate = [
  // All fields are optional for updates
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('relation')
    .optional()
    .isIn(['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'])
    .withMessage('Relation must be SPOUSE, CHILD, PARENT, SIBLING, or OTHER'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('dateOfBirth')
    .optional()
    .custom((value) => {
      if (!value) return true;
      
      let date;
      if (value.includes('/')) {
        // Handle dd/mm/yyyy format
        const [day, month, year] = value.split('/');
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(value);
      }
      
      if (isNaN(date.getTime())) {
        throw new Error('Date of birth must be a valid date');
      }
      
      if (date >= new Date()) {
        throw new Error('Date of birth must be in the past');
      }
      
      return true;
    }),
  
  body('age')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be between 1 and 120'),
  
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  
  body('pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
  
  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Occupation cannot exceed 100 characters'),
  
  body('emergencyContact')
    .optional()
    .isBoolean()
    .withMessage('Emergency contact must be true or false'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('relation').optional().isIn(['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER']).withMessage('Invalid relation')
];

const validateRouteParams = [
  param('buildingId').isMongoId().withMessage('Invalid building ID'),
  param('memberId').isMongoId().withMessage('Invalid member ID')
];

// Routes

/**
 * @route   POST /api/family-members/:buildingId
 * @desc    Add family member
 * @access  Private (Resident only)
 */
router.post('/:buildingId',
  validateRouteParams,
  validateFamilyMemberCreation,
  buildingAccess,
  authorizeRoles(['RESIDENT']),
  familyMemberController.createFamilyMember
);

/**
 * @route   GET /api/family-members/:buildingId
 * @desc    Get family members
 * @access  Private (Resident only)
 */
router.get('/:buildingId',
  validateRouteParams,
  validateQuery,
  buildingAccess,
  authorizeRoles(['RESIDENT']),
  familyMemberController.getFamilyMembers
);

/**
 * @route   GET /api/family-members/:buildingId/:memberId
 * @desc    Get single family member
 * @access  Private (Resident only)
 */
router.get('/:buildingId/:memberId',
  validateRouteParams,
  buildingAccess,
  authorizeRoles(['RESIDENT']),
  familyMemberController.getFamilyMember
);

/**
 * @route   PUT /api/family-members/:buildingId/:memberId
 * @desc    Update family member
 * @access  Private (Resident only)
 */
router.put('/:buildingId/:memberId',
  validateRouteParams,
  validateFamilyMemberUpdate,
  buildingAccess,
  authorizeRoles(['RESIDENT']),
  familyMemberController.updateFamilyMember
);

/**
 * @route   DELETE /api/family-members/:buildingId/:memberId
 * @desc    Delete family member
 * @access  Private (Resident only)
 */
router.delete('/:buildingId/:memberId',
  validateRouteParams,
  buildingAccess,
  authorizeRoles(['RESIDENT']),
  familyMemberController.deleteFamilyMember
);

module.exports = router;
