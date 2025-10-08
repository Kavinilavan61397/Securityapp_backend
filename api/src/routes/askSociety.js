const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { 
  createMessage, 
  getMessages, 
  getMessageById, 
  updateMessage, 
  deleteMessage 
} = require('../controllers/askSocietyController');

const router = express.Router();

// Validation middleware
const validateBuildingId = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format')
];

const validateMessageId = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID format')
];

const validateCreateMessage = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  
  body('image')
    .optional()
    .isString()
    .withMessage('Image must be a valid string (base64)'),
  
  body('status')
    .optional()
    .isIn(['OPEN', 'RESOLVED', 'CLOSED'])
    .withMessage('Status must be one of: OPEN, RESOLVED, CLOSED')
];

const validateUpdateMessage = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  
  body('image')
    .optional()
    .isString()
    .withMessage('Image must be a valid string (base64)'),
  
  body('status')
    .optional()
    .isIn(['OPEN', 'RESOLVED', 'CLOSED'])
    .withMessage('Status must be one of: OPEN, RESOLVED, CLOSED')
];

// Routes

// POST /api/ask-society/:buildingId - Create a new message
router.post('/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN']),
  validateBuildingId,
  validateCreateMessage,
  createMessage
);

// GET /api/ask-society/:buildingId - Get all messages for a building
router.get('/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  validateBuildingId,
  getMessages
);

// GET /api/ask-society/:buildingId/:messageId - Get single message
router.get('/:buildingId/:messageId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  validateBuildingId,
  validateMessageId,
  getMessageById
);

// PUT /api/ask-society/:buildingId/:messageId - Update a message
router.put('/:buildingId/:messageId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN']),
  validateBuildingId,
  validateMessageId,
  validateUpdateMessage,
  updateMessage
);

// DELETE /api/ask-society/:buildingId/:messageId - Delete a message
router.delete('/:buildingId/:messageId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  validateBuildingId,
  validateMessageId,
  deleteMessage
);

module.exports = router;

