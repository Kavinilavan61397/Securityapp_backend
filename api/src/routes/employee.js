const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const EmployeeController = require('../controllers/employeeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validateCreateEmployee = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  
  body('joiningDate')
    .notEmpty()
    .withMessage('Joining date is required')
    .isISO8601()
    .withMessage('Please enter a valid date (YYYY-MM-DD)'),
  
  body('employeeType')
    .notEmpty()
    .withMessage('Employee type is required')
    .isIn(['SECURITY_GUARD', 'RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'])
    .withMessage('Employee type must be one of: SECURITY_GUARD, RESIDENT_HELPER, TECHNICIAN, OTHER'),
  
  body('canLogin')
    .optional()
    .isBoolean()
    .withMessage('Can login must be a boolean value'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department cannot exceed 50 characters'),
  
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Designation cannot exceed 50 characters'),
  
  body('workSchedule.startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time format (HH:MM)'),
  
  body('workSchedule.endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time format (HH:MM)'),
  
  body('workSchedule.workingDays')
    .optional()
    .isArray()
    .withMessage('Working days must be an array'),
  
  body('workSchedule.workingDays.*')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid working day'),
  
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
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateUpdateEmployee = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  
  body('joiningDate')
    .optional()
    .isISO8601()
    .withMessage('Please enter a valid date (YYYY-MM-DD)'),
  
  body('employeeType')
    .optional()
    .isIn(['SECURITY_GUARD', 'RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'])
    .withMessage('Employee type must be one of: SECURITY_GUARD, RESIDENT_HELPER, TECHNICIAN, OTHER'),
  
  body('canLogin')
    .optional()
    .isBoolean()
    .withMessage('Can login must be a boolean value'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department cannot exceed 50 characters'),
  
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Designation cannot exceed 50 characters'),
  
  body('workSchedule.startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time format (HH:MM)'),
  
  body('workSchedule.endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time format (HH:MM)'),
  
  body('workSchedule.workingDays')
    .optional()
    .isArray()
    .withMessage('Working days must be an array'),
  
  body('workSchedule.workingDays.*')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid working day'),
  
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
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID'),
  
  param('employeeId')
    .isMongoId()
    .withMessage('Invalid employee ID')
];

const validateQuery = [
  query('employeeType')
    .optional()
    .isIn(['SECURITY_GUARD', 'RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'])
    .withMessage('Invalid employee type'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
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

// Get employee categories (MUST be before /:buildingId routes)
router.get(
  '/categories',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  EmployeeController.getEmployeeCategories
);

// Generate employee code (MUST be before /:buildingId routes)
router.get(
  '/generate-code',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  EmployeeController.generateEmployeeCode
);

// Create employee
router.post(
  '/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams[0], // buildingId validation
  validateCreateEmployee,
  EmployeeController.createEmployee
);

// Get all employees for a building
router.get(
  '/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams[0], // buildingId validation
  validateQuery,
  EmployeeController.getEmployees
);

// Get single employee
router.get(
  '/:buildingId/:employeeId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  EmployeeController.getEmployeeById
);

// Update employee
router.put(
  '/:buildingId/:employeeId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  validateUpdateEmployee,
  EmployeeController.updateEmployee
);

// Delete employee
router.delete(
  '/:buildingId/:employeeId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  EmployeeController.deleteEmployee
);

module.exports = router;
