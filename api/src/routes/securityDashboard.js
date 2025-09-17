const express = require('express');
const { param, query } = require('express-validator');
const SecurityDashboardController = require('../controllers/securityDashboardController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Validation middleware
const validateBuildingId = [
  param('buildingId').isMongoId().withMessage('Invalid building ID')
];

const validateQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isIn(['CAB_DRIVER', 'DELIVERY_AGENT', 'FLAT_EMPLOYEE', 'OTHER']).withMessage('Invalid category')
];

/**
 * Security Dashboard Routes
 * All routes require SECURITY role
 */

/**
 * @route   GET /api/security/dashboard/:buildingId
 * @desc    Get security dashboard overview
 * @access  Private (Security only)
 */
router.get('/dashboard/:buildingId',
  validateBuildingId,
  buildingAccess,
  authorizeRoles(['SECURITY']),
  SecurityDashboardController.getDashboard
);

/**
 * @route   GET /api/security/today-visits/:buildingId
 * @desc    Get today's visits for security
 * @access  Private (Security only)
 */
router.get('/today-visits/:buildingId',
  validateBuildingId,
  validateQuery,
  buildingAccess,
  authorizeRoles(['SECURITY']),
  SecurityDashboardController.getTodayVisits
);

/**
 * @route   GET /api/security/recent-activity/:buildingId
 * @desc    Get recent activity by category
 * @access  Private (Security only)
 */
router.get('/recent-activity/:buildingId',
  validateBuildingId,
  validateQuery,
  buildingAccess,
  authorizeRoles(['SECURITY']),
  SecurityDashboardController.getRecentActivity
);

/**
 * @route   GET /api/security/quick-actions/:buildingId
 * @desc    Get quick actions data
 * @access  Private (Security only)
 */
router.get('/quick-actions/:buildingId',
  validateBuildingId,
  buildingAccess,
  authorizeRoles(['SECURITY']),
  SecurityDashboardController.getQuickActions
);

module.exports = router;
