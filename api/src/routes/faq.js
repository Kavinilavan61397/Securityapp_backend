const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const FAQController = require('../controllers/faqController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validateFAQ = [
  body('question')
    .trim()
    .notEmpty()
    .withMessage('FAQ question is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Question must be between 10 and 500 characters'),
  body('answer')
    .trim()
    .notEmpty()
    .withMessage('FAQ answer is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Answer must be between 20 and 2000 characters'),
  body('category')
    .optional()
    .isIn(['GENERAL', 'ACCOUNT', 'TECHNICAL', 'SECURITY', 'VISITORS', 'COMPLAINTS', 'OTHER'])
    .withMessage('Invalid category value'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
];

const validateFAQUpdate = [
  body('question')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Question must be between 10 and 500 characters'),
  body('answer')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Answer must be between 20 and 2000 characters'),
  body('category')
    .optional()
    .isIn(['GENERAL', 'ACCOUNT', 'TECHNICAL', 'SECURITY', 'VISITORS', 'COMPLAINTS', 'OTHER'])
    .withMessage('Invalid category value'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
];

// Public routes (for residents)
router.get(
  '/',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  FAQController.getAllFAQs
);

router.get(
  '/categories',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  FAQController.getFAQCategories
);

router.get(
  '/:id',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  FAQController.getFAQById
);

// Admin routes
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateFAQ,
  FAQController.createFAQ
);

router.get(
  '/admin/all',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  FAQController.getAllFAQsForAdmin
);

router.get(
  '/admin/stats',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  FAQController.getFAQStats
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateFAQUpdate,
  FAQController.updateFAQ
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  FAQController.deleteFAQ
);

module.exports = router;
