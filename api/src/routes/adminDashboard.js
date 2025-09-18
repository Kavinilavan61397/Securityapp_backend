const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();

const AdminDashboardController = require('../controllers/adminDashboardController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validateParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID')
];

const validateQuery = [
  query('category')
    .optional()
    .isIn(['CABS', 'DELIVERY', 'EMPLOYEES', 'OTHERS'])
    .withMessage('Invalid category value'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Routes

// Get admin dashboard overview
router.get(
  '/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  AdminDashboardController.getAdminDashboard
);

// Get today's visits
router.get(
  '/:buildingId/today-visits',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  AdminDashboardController.getTodayVisits
);

// Get recent activity
router.get(
  '/:buildingId/recent-activity',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  validateQuery,
  AdminDashboardController.getRecentActivity
);

// Get quick actions
router.get(
  '/:buildingId/quick-actions',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  AdminDashboardController.getQuickActions
);

module.exports = router;
