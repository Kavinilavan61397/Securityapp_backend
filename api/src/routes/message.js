const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const MessageController = require('../controllers/messageController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validatePostMessage = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Message title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  
  body('messageType')
    .optional()
    .isIn(['ALERT', 'ANNOUNCEMENT', 'MAINTENANCE', 'GENERAL'])
    .withMessage('Message type must be one of: ALERT, ANNOUNCEMENT, MAINTENANCE, GENERAL'),
  
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be one of: LOW, MEDIUM, HIGH, URGENT'),
  
  body('targetAudience')
    .optional()
    .isIn(['ALL_RESIDENTS', 'SPECIFIC_FLOORS', 'SPECIFIC_FLATS', 'EMPLOYEES_ONLY'])
    .withMessage('Target audience must be one of: ALL_RESIDENTS, SPECIFIC_FLOORS, SPECIFIC_FLATS, EMPLOYEES_ONLY'),
  
  body('specificTargets.floors')
    .optional()
    .isArray()
    .withMessage('Floors must be an array'),
  
  body('specificTargets.floors.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Floor must be between 1 and 10 characters'),
  
  body('specificTargets.flatNumbers')
    .optional()
    .isArray()
    .withMessage('Flat numbers must be an array'),
  
  body('specificTargets.flatNumbers.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Flat number must be between 1 and 20 characters'),
  
  body('specificTargets.employeeTypes')
    .optional()
    .isArray()
    .withMessage('Employee types must be an array'),
  
  body('specificTargets.employeeTypes.*')
    .optional()
    .isIn(['SECURITY_GUARD', 'RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'])
    .withMessage('Invalid employee type'),
  
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Please enter a valid scheduled date (YYYY-MM-DDTHH:mm:ss.sssZ)'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Please enter a valid expiration date (YYYY-MM-DDTHH:mm:ss.sssZ)'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tag must be between 1 and 50 characters'),
  
  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('Is pinned must be a boolean value')
];

const validateUpdateMessage = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  
  body('messageType')
    .optional()
    .isIn(['ALERT', 'ANNOUNCEMENT', 'MAINTENANCE', 'GENERAL'])
    .withMessage('Message type must be one of: ALERT, ANNOUNCEMENT, MAINTENANCE, GENERAL'),
  
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be one of: LOW, MEDIUM, HIGH, URGENT'),
  
  body('targetAudience')
    .optional()
    .isIn(['ALL_RESIDENTS', 'SPECIFIC_FLOORS', 'SPECIFIC_FLATS', 'EMPLOYEES_ONLY'])
    .withMessage('Target audience must be one of: ALL_RESIDENTS, SPECIFIC_FLOORS, SPECIFIC_FLATS, EMPLOYEES_ONLY'),
  
  body('specificTargets.floors')
    .optional()
    .isArray()
    .withMessage('Floors must be an array'),
  
  body('specificTargets.floors.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Floor must be between 1 and 10 characters'),
  
  body('specificTargets.flatNumbers')
    .optional()
    .isArray()
    .withMessage('Flat numbers must be an array'),
  
  body('specificTargets.flatNumbers.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Flat number must be between 1 and 20 characters'),
  
  body('specificTargets.employeeTypes')
    .optional()
    .isArray()
    .withMessage('Employee types must be an array'),
  
  body('specificTargets.employeeTypes.*')
    .optional()
    .isIn(['SECURITY_GUARD', 'RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'])
    .withMessage('Invalid employee type'),
  
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Please enter a valid scheduled date (YYYY-MM-DDTHH:mm:ss.sssZ)'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Please enter a valid expiration date (YYYY-MM-DDTHH:mm:ss.sssZ)'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tag must be between 1 and 50 characters'),
  
  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('Is pinned must be a boolean value')
];

const validateParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID'),
  
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID')
];

const validateQuery = [
  query('messageType')
    .optional()
    .isIn(['ALERT', 'ANNOUNCEMENT', 'MAINTENANCE', 'GENERAL'])
    .withMessage('Invalid message type'),
  
  query('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority value'),
  
  query('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean value'),
  
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

// Post a new message
router.post(
  '/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams[0], // buildingId validation
  validatePostMessage,
  MessageController.postMessage
);

// Get previous posts (MUST be before /:buildingId routes)
router.get(
  '/:buildingId/previous-posts',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams[0], // buildingId validation
  MessageController.getPreviousPosts
);

// Get all messages for a building
router.get(
  '/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams[0], // buildingId validation
  validateQuery,
  MessageController.getMessages
);

// Get single message
router.get(
  '/:buildingId/:messageId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  MessageController.getMessageById
);

// Update message
router.put(
  '/:buildingId/:messageId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  validateUpdateMessage,
  MessageController.updateMessage
);

// Delete message
router.delete(
  '/:buildingId/:messageId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  MessageController.deleteMessage
);


module.exports = router;
