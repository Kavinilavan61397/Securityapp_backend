const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, param, query, validationResult } = require('express-validator');
const ServiceRequestController = require('../controllers/serviceRequestController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validateParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format')
];

const validateCreateServiceRequest = [
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
  
  body('requestType')
    .optional()
    .isIn(['PLUMBING', 'ELECTRICAL', 'HOUSE_HELP', 'MAINTENANCE', 'CLEANING', 'OTHER'])
    .withMessage('Invalid request type. Must be one of: PLUMBING, ELECTRICAL, HOUSE_HELP, MAINTENANCE, CLEANING, OTHER'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description must be between 1 and 2000 characters'),
  
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority. Must be one of: LOW, MEDIUM, HIGH, URGENT'),
  
  body('urgency')
    .optional()
    .isIn(['NORMAL', 'URGENT', 'EMERGENCY'])
    .withMessage('Invalid urgency. Must be one of: NORMAL, URGENT, EMERGENCY'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Location cannot exceed 500 characters'),
  
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Flat number cannot exceed 50 characters'),
  
  body('preferredDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid preferred date format (YYYY-MM-DD)'),
  
  body('preferredTime')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Preferred time cannot exceed 100 characters'),
  
  // Employee assignment is optional - can be assigned later
  // body().custom((value) => {
  //   const { employeeId, employeeCode, employeeName } = value;
  //   if (!employeeId && !employeeCode && !employeeName) {
  //     throw new Error('Either employeeId, employeeCode, or employeeName is required');
  //   }
  //   return true;
  // })
];

const validateGetServiceRequests = [
  ...validateParams,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED']).withMessage('Invalid status'),
  query('requestType').optional().isIn(['PLUMBING', 'ELECTRICAL', 'HOUSE_HELP', 'MAINTENANCE', 'CLEANING', 'OTHER']).withMessage('Invalid request type'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format (YYYY-MM-DD)'),
  query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format (YYYY-MM-DD)'),
  query('today').optional().isBoolean().withMessage('Today must be a boolean value')
];

const validateGetServiceRequest = [
  ...validateParams,
  param('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
];

const validateUpdateServiceRequest = [
  ...validateParams,
  param('requestId')
    .notEmpty()
    .withMessage('Request ID is required'),
  
  body('status')
    .optional()
    .isIn(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'])
    .withMessage('Invalid status. Must be one of: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, REJECTED'),
  
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin notes cannot exceed 1000 characters'),
  
  body('completionNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Completion notes cannot exceed 1000 characters'),
  
  body('estimatedCost')
    .optional()
    .isNumeric()
    .withMessage('Estimated cost must be a number')
    .isFloat({ min: 0 })
    .withMessage('Estimated cost cannot be negative'),
  
  body('actualCost')
    .optional()
    .isNumeric()
    .withMessage('Actual cost must be a number')
    .isFloat({ min: 0 })
    .withMessage('Actual cost cannot be negative'),
  
  body('costApproved')
    .optional()
    .isBoolean()
    .withMessage('Cost approved must be a boolean value')
];

const validateGetStats = [
  ...validateParams,
  query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format (YYYY-MM-DD)'),
  query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format (YYYY-MM-DD)')
];

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Routes for Service Request Management

/**
 * @route   POST /api/service-requests/:buildingId
 * @desc    Create a new service request
 * @access  Private (RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.post('/:buildingId',
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateCreateServiceRequest,
  ServiceRequestController.createServiceRequest
);

/**
 * @route   GET /api/service-requests/:buildingId
 * @desc    Get all service requests for a building
 * @access  Private (RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.get('/:buildingId',
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateGetServiceRequests,
  ServiceRequestController.getServiceRequests
);

/**
 * @route   GET /api/service-requests/:buildingId/stats
 * @desc    Get service request statistics for a building
 * @access  Private (RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.get('/:buildingId/stats',
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateGetStats,
  ServiceRequestController.getServiceRequestStats
);

/**
 * @route   GET /api/service-requests/:buildingId/:requestId
 * @desc    Get a specific service request by ID
 * @access  Private (RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.get('/:buildingId/:requestId',
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateGetServiceRequest,
  ServiceRequestController.getServiceRequest
);

/**
 * @route   PUT /api/service-requests/:buildingId/:requestId
 * @desc    Update a service request
 * @access  Private (RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN)
 */
router.put('/:buildingId/:requestId',
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateUpdateServiceRequest,
  ServiceRequestController.updateServiceRequest
);

module.exports = router;
