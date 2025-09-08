const express = require('express');
const { body, param, query } = require('express-validator');
const communicationController = require('../controllers/communicationController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const validateCommunicationCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be between 10 and 5000 characters'),
  body('communicationType')
    .isIn(['NOTICE', 'ANNOUNCEMENT', 'EMERGENCY', 'MAINTENANCE', 'EVENT', 'GENERAL'])
    .withMessage('Communication type must be one of: NOTICE, ANNOUNCEMENT, EMERGENCY, MAINTENANCE, EVENT, GENERAL'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be one of: LOW, MEDIUM, HIGH, URGENT'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
  body('targetAudience')
    .optional()
    .isIn(['ALL', 'RESIDENTS', 'SECURITY', 'ADMIN', 'MAINTENANCE', 'SPECIFIC'])
    .withMessage('Target audience must be one of: ALL, RESIDENTS, SECURITY, ADMIN, MAINTENANCE, SPECIFIC'),
  body('specificRecipients')
    .optional()
    .isArray()
    .withMessage('Specific recipients must be an array'),
  body('specificRecipients.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date'),
  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean value'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateCommunicationUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be between 10 and 5000 characters'),
  body('communicationType')
    .optional()
    .isIn(['NOTICE', 'ANNOUNCEMENT', 'EMERGENCY', 'MAINTENANCE', 'EVENT', 'GENERAL'])
    .withMessage('Communication type must be one of: NOTICE, ANNOUNCEMENT, EMERGENCY, MAINTENANCE, EVENT, GENERAL'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be one of: LOW, MEDIUM, HIGH, URGENT'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category cannot exceed 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
  body('targetAudience')
    .optional()
    .isIn(['ALL', 'RESIDENTS', 'SECURITY', 'ADMIN', 'MAINTENANCE', 'SPECIFIC'])
    .withMessage('Target audience must be one of: ALL, RESIDENTS, SECURITY, ADMIN, MAINTENANCE, SPECIFIC'),
  body('specificRecipients')
    .optional()
    .isArray()
    .withMessage('Specific recipients must be an array'),
  body('specificRecipients.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date'),
  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean value'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

const validateRouteParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID'),
  param('communicationId')
    .isMongoId()
    .withMessage('Invalid communication ID')
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
  query('communicationType')
    .optional()
    .isIn(['NOTICE', 'ANNOUNCEMENT', 'EMERGENCY', 'MAINTENANCE', 'EVENT', 'GENERAL'])
    .withMessage('Invalid communication type'),
  query('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  query('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned must be a boolean value'),
  query('sortBy')
    .optional()
    .isIn(['title', 'createdAt', 'updatedAt', 'priority', 'views', 'likeCount', 'commentCount'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Routes

// Create communication
router.post('/:buildingId',
  authenticateToken,
  buildingAccess,
  validateCommunicationCreation,
  communicationController.createCommunication
);

// Get all communications for a building
router.get('/:buildingId',
  authenticateToken,
  buildingAccess,
  validateQueryParams,
  communicationController.getCommunications
);

// Get single communication
router.get('/:buildingId/:communicationId',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  communicationController.getCommunication
);

// Update communication
router.put('/:buildingId/:communicationId',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  validateCommunicationUpdate,
  communicationController.updateCommunication
);

// Delete communication
router.delete('/:buildingId/:communicationId',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  communicationController.deleteCommunication
);

// Toggle pin status
router.put('/:buildingId/:communicationId/pin',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  communicationController.togglePin
);

// Add comment
router.post('/:buildingId/:communicationId/comment',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  validateComment,
  communicationController.addComment
);

// Toggle like
router.put('/:buildingId/:communicationId/like',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  communicationController.toggleLike
);

// Get communication statistics
router.get('/:buildingId/stats',
  authenticateToken,
  buildingAccess,
  communicationController.getCommunicationStats
);

module.exports = router;

