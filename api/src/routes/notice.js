const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { 
  createNotice, 
  getNotices, 
  getNoticeById, 
  updateNotice, 
  deleteNotice 
} = require('../controllers/noticeController');

const router = express.Router();

// Validation middleware
const validateBuildingId = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format')
];

const validateNoticeId = [
  param('noticeId')
    .isMongoId()
    .withMessage('Invalid notice ID format')
];

const validateCreateNotice = [
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
  
  body('status')
    .optional()
    .isIn(['OPEN', 'RESOLVED', 'CLOSED'])
    .withMessage('Status must be one of: OPEN, RESOLVED, CLOSED')
];

const validateUpdateNotice = [
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
  
  body('status')
    .optional()
    .isIn(['OPEN', 'RESOLVED', 'CLOSED'])
    .withMessage('Status must be one of: OPEN, RESOLVED, CLOSED')
];

// Routes

// POST /api/notices/:buildingId - Create a new notice
router.post('/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateBuildingId,
  validateCreateNotice,
  createNotice
);

// GET /api/notices/:buildingId - Get all notices for a building
router.get('/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  validateBuildingId,
  getNotices
);

// GET /api/notices/:buildingId/:noticeId - Get single notice
router.get('/:buildingId/:noticeId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  validateBuildingId,
  validateNoticeId,
  getNoticeById
);

// PUT /api/notices/:buildingId/:noticeId - Update a notice
router.put('/:buildingId/:noticeId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateBuildingId,
  validateNoticeId,
  validateUpdateNotice,
  updateNotice
);

// DELETE /api/notices/:buildingId/:noticeId - Delete a notice
router.delete('/:buildingId/:noticeId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  validateBuildingId,
  validateNoticeId,
  deleteNotice
);

module.exports = router;
