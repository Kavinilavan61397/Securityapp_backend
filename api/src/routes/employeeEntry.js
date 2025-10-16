const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, param, query, validationResult } = require('express-validator');
const EmployeeEntryController = require('../controllers/employeeEntryController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validateParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format')
];

const validateEmployeeEntry = [
  body('employeeId')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid employee ID format');
      }
      return true;
    }),
  
  body('employeeCode')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Employee code must be between 1 and 20 characters')
    .trim(),
  
  body('employeeName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Employee name must be between 1 and 100 characters')
    .trim(),
  
  body('purpose')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Purpose cannot exceed 200 characters')
    .trim(),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .trim(),
  
  // Custom validation: At least one of employeeId, employeeCode, or employeeName required
  body().custom((value) => {
    const { employeeId, employeeCode, employeeName } = value;
    if (!employeeId && !employeeCode && !employeeName) {
      throw new Error('Either employeeId, employeeCode, or employeeName is required');
    }
    return true;
  })
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
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('employeeType')
    .optional()
    .isIn(['RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'])
    .withMessage('Invalid employee type'),
  
  query('today')
    .optional()
    .isBoolean()
    .withMessage('Today must be true or false')
];

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/employee-entries/:buildingId/log-entry
 * @desc    Log employee entry
 * @access  SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
 */
router.post('/:buildingId/log-entry',
  [...validateParams, ...validateEmployeeEntry],
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN', 'RESIDENT']),
  EmployeeEntryController.logEmployeeEntry
);

/**
 * @route   GET /api/employee-entries/:buildingId
 * @desc    Get employee entries for a building
 * @access  SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
 */
router.get('/:buildingId',
  [...validateParams, ...validateQuery],
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN', 'RESIDENT']),
  EmployeeEntryController.getEmployeeEntries
);

/**
 * @route   GET /api/employee-entries/:buildingId/available-employees
 * @desc    Get available employees for entry tracking
 * @access  SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
 */
router.get('/:buildingId/available-employees',
  [
    param('buildingId')
      .isMongoId()
      .withMessage('Invalid building ID format'),
    
    query('employeeType')
      .optional()
      .isIn(['RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'])
      .withMessage('Invalid employee type')
  ],
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN', 'RESIDENT']),
  EmployeeEntryController.getAvailableEmployees
);

/**
 * @route   GET /api/employee-entries/:buildingId/stats
 * @desc    Get employee entry statistics
 * @access  SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
 */
router.get('/:buildingId/stats',
  [
    param('buildingId')
      .isMongoId()
      .withMessage('Invalid building ID format'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ],
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN', 'RESIDENT']),
  EmployeeEntryController.getEntryStats
);

/**
 * @route   GET /api/employee-entries/:buildingId/:entryId
 * @desc    Get specific employee entry by ID
 * @access  SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
 */
router.get('/:buildingId/:entryId',
  [
    param('buildingId')
      .isMongoId()
      .withMessage('Invalid building ID format'),
    
    param('entryId')
      .isMongoId()
      .withMessage('Invalid entry ID format')
  ],
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN', 'RESIDENT']),
  EmployeeEntryController.getEmployeeEntryById
);

module.exports = router;
