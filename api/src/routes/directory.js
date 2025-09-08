const express = require('express');
const { body, param, query } = require('express-validator');
const directoryController = require('../controllers/directoryController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const validateDirectoryCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phoneNumber')
    .trim()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  body('directoryType')
    .isIn(['RESIDENT', 'SECURITY', 'ADMIN', 'MAINTENANCE', 'EMERGENCY', 'SERVICE', 'OTHER'])
    .withMessage('Directory type must be one of: RESIDENT, SECURITY, ADMIN, MAINTENANCE, EMERGENCY, SERVICE, OTHER'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters'),
  body('floorNumber')
    .optional()
    .isInt({ min: 0, max: 200 })
    .withMessage('Floor number must be between 0 and 200'),
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  body('address.pincode')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Pincode cannot exceed 10 characters'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  body('emergencyContact.phone')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid emergency contact phone number'),
  body('emergencyContact.relation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relation cannot exceed 50 characters'),
  body('workingHours.start')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('workingHours.end')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('workingHours.days')
    .optional()
    .isArray()
    .withMessage('Working days must be an array'),
  body('workingHours.days.*')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day name'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters')
];

const validateDirectoryUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  body('directoryType')
    .optional()
    .isIn(['RESIDENT', 'SECURITY', 'ADMIN', 'MAINTENANCE', 'EMERGENCY', 'SERVICE', 'OTHER'])
    .withMessage('Directory type must be one of: RESIDENT, SECURITY, ADMIN, MAINTENANCE, EMERGENCY, SERVICE, OTHER'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters'),
  body('floorNumber')
    .optional()
    .isInt({ min: 0, max: 200 })
    .withMessage('Floor number must be between 0 and 200'),
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  body('address.pincode')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Pincode cannot exceed 10 characters'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  body('emergencyContact.phone')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid emergency contact phone number'),
  body('emergencyContact.relation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relation cannot exceed 50 characters'),
  body('workingHours.start')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('workingHours.end')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('workingHours.days')
    .optional()
    .isArray()
    .withMessage('Working days must be an array'),
  body('workingHours.days.*')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day name'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters')
];

const validateVerification = [
  body('isVerified')
    .isBoolean()
    .withMessage('isVerified must be a boolean value'),
  body('verificationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Verification notes cannot exceed 500 characters')
];

const validateRouteParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID'),
  param('entryId')
    .isMongoId()
    .withMessage('Invalid entry ID')
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
  query('directoryType')
    .optional()
    .isIn(['RESIDENT', 'SECURITY', 'ADMIN', 'MAINTENANCE', 'EMERGENCY', 'SERVICE', 'OTHER'])
    .withMessage('Invalid directory type'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  query('sortBy')
    .optional()
    .isIn(['name', 'phoneNumber', 'email', 'flatNumber', 'directoryType', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Routes

// Add directory entry
router.post('/:buildingId',
  authenticateToken,
  buildingAccess,
  validateDirectoryCreation,
  directoryController.addDirectoryEntry
);

// Get all directory entries for a building
router.get('/:buildingId',
  authenticateToken,
  buildingAccess,
  validateQueryParams,
  directoryController.getDirectoryEntries
);

// Get single directory entry
router.get('/:buildingId/:entryId',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  directoryController.getDirectoryEntry
);

// Update directory entry
router.put('/:buildingId/:entryId',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  validateDirectoryUpdate,
  directoryController.updateDirectoryEntry
);

// Delete directory entry
router.delete('/:buildingId/:entryId',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  directoryController.deleteDirectoryEntry
);

// Verify directory entry (Admin only)
router.put('/:buildingId/:entryId/verify',
  authenticateToken,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateRouteParams,
  validateVerification,
  directoryController.verifyDirectoryEntry
);

// Get directory statistics
router.get('/:buildingId/stats',
  authenticateToken,
  buildingAccess,
  directoryController.getDirectoryStats
);

module.exports = router;
