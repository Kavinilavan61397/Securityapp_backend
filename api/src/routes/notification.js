const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Notification Routes
 * Handles all notification-related API endpoints
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

// Create notification (Admin only)
router.post('/:buildingId',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    body('recipientId').isMongoId().withMessage('Valid recipient ID is required'),
    body('recipientRole').isIn(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']).withMessage('Invalid recipient role'),
    body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
    body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message must be 1-500 characters'),
    body('type').isIn([
      'VISITOR_ARRIVAL',
      'VISITOR_DEPARTURE',
      'VISIT_APPROVAL_REQUEST',
      'VISIT_APPROVED',
      'VISIT_REJECTED',
      'VISIT_CANCELLED',
      'SECURITY_ALERT',
      'SYSTEM_ALERT',
      'ADMIN_NOTIFICATION',
      'GENERAL_ANNOUNCEMENT'
    ]).withMessage('Invalid notification type'),
    body('category').optional().isIn(['INFO', 'WARNING', 'ALERT', 'SUCCESS', 'ERROR']).withMessage('Invalid category'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).withMessage('Invalid priority'),
    body('isUrgent').optional().isBoolean().withMessage('isUrgent must be boolean'),
    body('relatedVisitId').optional().isMongoId().withMessage('Invalid visit ID'),
    body('relatedVisitorId').optional().isMongoId().withMessage('Invalid visitor ID'),
    body('relatedUserId').optional().isMongoId().withMessage('Invalid user ID'),
    body('actionRequired').optional().isBoolean().withMessage('actionRequired must be boolean'),
    body('actionType').optional().isIn(['APPROVE', 'REJECT', 'ACKNOWLEDGE', 'RESPOND', 'NONE']).withMessage('Invalid action type'),
    body('actionDeadline').optional().isISO8601().withMessage('Invalid deadline format'),
    body('expiresAt').optional().isISO8601().withMessage('Invalid expiration format'),
    body('isPersistent').optional().isBoolean().withMessage('isPersistent must be boolean')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.createNotification
);

// Get notifications for user
router.get('/:buildingId',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']).withMessage('Invalid status'),
    query('type').optional().isIn([
      'VISITOR_ARRIVAL',
      'VISITOR_DEPARTURE',
      'VISIT_APPROVAL_REQUEST',
      'VISIT_APPROVED',
      'VISIT_REJECTED',
      'VISIT_CANCELLED',
      'SECURITY_ALERT',
      'SYSTEM_ALERT',
      'ADMIN_NOTIFICATION',
      'GENERAL_ANNOUNCEMENT'
    ]).withMessage('Invalid type'),
    query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).withMessage('Invalid priority'),
    query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be boolean'),
    query('urgentOnly').optional().isBoolean().withMessage('urgentOnly must be boolean')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.getNotifications
);

// Get notification statistics
router.get('/:buildingId/stats',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.getNotificationStats
);

// Get unread notification count
router.get('/:buildingId/unread-count',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.getUnreadCount
);

// Search notifications
router.get('/:buildingId/search',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    query('q').optional().trim().isLength({ min: 1 }).withMessage('Search query cannot be empty'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('type').optional().isIn([
      'VISITOR_ARRIVAL',
      'VISITOR_DEPARTURE',
      'VISIT_APPROVAL_REQUEST',
      'VISIT_APPROVED',
      'VISIT_REJECTED',
      'VISIT_CANCELLED',
      'SECURITY_ALERT',
      'SYSTEM_ALERT',
      'ADMIN_NOTIFICATION',
      'GENERAL_ANNOUNCEMENT'
    ]).withMessage('Invalid type'),
    query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).withMessage('Invalid priority'),
    query('status').optional().isIn(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']).withMessage('Invalid status'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.searchNotifications
);

// Mark multiple notifications as read
router.patch('/:buildingId/read-multiple',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    body('notificationIds').isArray({ min: 1 }).withMessage('Notification IDs array is required'),
    body('notificationIds.*').isMongoId().withMessage('Invalid notification ID')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.markMultipleAsRead
);

// Get notification by ID
router.get('/:buildingId/:notificationId',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    param('notificationId').isMongoId().withMessage('Invalid notification ID')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.getNotificationById
);

// Mark notification as read
router.patch('/:buildingId/:notificationId/read',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    param('notificationId').isMongoId().withMessage('Invalid notification ID')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.markAsRead
);

// Delete notification
router.delete('/:buildingId/:notificationId',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    param('notificationId').isMongoId().withMessage('Invalid notification ID')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.deleteNotification
);

// Bulk delete notifications
router.delete('/:buildingId/bulk',
  [
    param('buildingId').isMongoId().withMessage('Invalid building ID'),
    body('notificationIds').optional().isArray().withMessage('Notification IDs must be array'),
    body('notificationIds.*').optional().isMongoId().withMessage('Invalid notification ID'),
    body('deleteAll').optional().isBoolean().withMessage('deleteAll must be boolean'),
    body('olderThan').optional().isISO8601().withMessage('Invalid olderThan date format')
  ],
  validateParams,
  authenticateToken,
  buildingAccess,
  notificationController.bulkDeleteNotifications
);

module.exports = router;
