const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const userProfileController = require('../controllers/userProfileController');
const { authenticateToken } = require('../middleware/auth');

/**
 * User Profile Routes
 * Handles user profile management including photo upload, update, and deletion
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

// Get current user profile
router.get('/me',
  authenticateToken,
  userProfileController.getUserProfile
);

// Update current user profile (without photo)
router.put('/me',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('phoneNumber').optional().trim().matches(/^[+]?[\d\s\-\(\)]+$/).withMessage('Invalid phone number'),
    body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
    body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Invalid gender'),
    body('address').optional().trim().isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),
    body('completeAddress').optional().trim().isLength({ max: 500 }).withMessage('Complete address cannot exceed 500 characters'),
    body('city').optional().trim().isLength({ max: 100 }).withMessage('City name cannot exceed 100 characters'),
    body('pincode').optional().trim().matches(/^\d{6}$/).withMessage('Pincode must be 6 digits'),
    body('flatNumber').optional().trim().isLength({ max: 20 }).withMessage('Flat number cannot exceed 20 characters'),
    body('tenantType').optional().isIn(['OWNER', 'TENANT']).withMessage('Invalid tenant type')
  ],
  validateParams,
  authenticateToken,
  userProfileController.updateUserProfile
);

// Upload profile photo
router.post('/me/photo',
  authenticateToken,
  userProfileController.upload.single('photo'),
  userProfileController.uploadProfilePhoto
);

// Update profile photo
router.put('/me/photo',
  authenticateToken,
  userProfileController.upload.single('photo'),
  userProfileController.updateProfilePhoto
);

// Delete profile photo
router.delete('/me/photo',
  authenticateToken,
  userProfileController.deleteProfilePhoto
);

// Get profile photo
router.get('/me/photo',
  authenticateToken,
  userProfileController.getProfilePhoto
);

// Get user profile by ID (for admin purposes)
router.get('/:userId',
  [
    param('userId').isMongoId().withMessage('Invalid user ID')
  ],
  validateParams,
  authenticateToken,
  userProfileController.getUserProfileById
);

module.exports = router;
