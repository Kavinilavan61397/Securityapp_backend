const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Analytics Routes
 * Provides comprehensive analytics and reporting endpoints
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

// Admin role middleware (only admins can access analytics)
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BUILDING_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
  next();
};

// Get building analytics overview
router.get('/:buildingId/overview',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  adminOnly,
  analyticsController.getBuildingAnalytics
);

// Get visit trends and patterns
router.get('/:buildingId/visits/trends',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    query('groupBy').optional().isIn(['hour', 'day', 'week', 'month']).withMessage('Invalid groupBy value')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  adminOnly,
  analyticsController.getVisitTrends
);

// Get security analytics
router.get('/:buildingId/security',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  adminOnly,
  analyticsController.getSecurityAnalytics
);

// Get user activity analytics
router.get('/:buildingId/users/activity',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  adminOnly,
  analyticsController.getUserActivityAnalytics
);

// Get system performance metrics
router.get('/:buildingId/performance',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  adminOnly,
  analyticsController.getSystemPerformanceMetrics
);

module.exports = router;
