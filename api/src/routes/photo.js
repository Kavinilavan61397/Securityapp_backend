const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const photoController = require('../controllers/photoController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Photo Routes
 * Handles all photo-related API endpoints including upload, retrieval, and management
 */

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

    // Super admin can access any building
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user has access to this building
    if (user.buildingId && user.buildingId.toString() !== buildingId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Building access validation failed',
      error: error.message
    });
  }
};

// Upload photo
router.post('/:buildingId/upload',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    body('relatedType').optional().isIn(['VISITOR', 'VISIT', 'USER', 'BUILDING', 'OTHER']).withMessage('Invalid related type'),
    body('relatedId').optional().isMongoId().withMessage('Invalid related ID'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().trim().isLength({ max: 50 }).withMessage('Tag cannot exceed 50 characters'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be boolean')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  photoController.upload.single('photo'),
  photoController.uploadPhoto
);

// Get photos for a building
router.get('/:buildingId',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('relatedType').optional().isIn(['VISITOR', 'VISIT', 'USER', 'BUILDING', 'OTHER']).withMessage('Invalid related type'),
    query('relatedId').optional().isMongoId().withMessage('Invalid related ID'),
    query('tags').optional().isArray().withMessage('Tags must be an array'),
    query('tags.*').optional().trim().isLength({ max: 50 }).withMessage('Tag cannot exceed 50 characters'),
    query('isPublic').optional().isBoolean().withMessage('isPublic must be boolean'),
    query('uploadedBy').optional().isMongoId().withMessage('Invalid uploadedBy ID')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  photoController.getPhotos
);

// Get photo statistics (MUST be before /:photoId route)
router.get('/:buildingId/stats',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  photoController.getPhotoStats
);

// Search photos (MUST be before /:photoId route)
router.get('/:buildingId/search',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('q').optional().trim().isLength({ min: 1 }).withMessage('Search query cannot be empty'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('relatedType').optional().isIn(['VISITOR', 'VISIT', 'USER', 'BUILDING', 'OTHER']).withMessage('Invalid related type'),
    query('tags').optional().isArray().withMessage('Tags must be an array'),
    query('tags.*').optional().trim().isLength({ max: 50 }).withMessage('Tag cannot exceed 50 characters'),
    query('isPublic').optional().isBoolean().withMessage('isPublic must be boolean'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  photoController.searchPhotos
);

// Get photo by ID (MUST be after specific routes)
router.get('/:buildingId/:photoId',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    param('photoId').isMongoId().withMessage('Invalid photo ID')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  photoController.getPhoto
);

// Stream photo file
router.get('/:buildingId/:photoId/stream',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    param('photoId').isMongoId().withMessage('Invalid photo ID')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  photoController.streamPhoto
);

// Update photo metadata
router.put('/:buildingId/:photoId',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    param('photoId').isMongoId().withMessage('Invalid photo ID'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().trim().isLength({ max: 50 }).withMessage('Tag cannot exceed 50 characters'),
    body('isPublic').optional().isBoolean().withMessage('isPublic must be boolean')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  photoController.updatePhoto
);

// Delete photo
router.delete('/:buildingId/:photoId',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    param('photoId').isMongoId().withMessage('Invalid photo ID')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  photoController.deletePhoto
);

module.exports = router;
