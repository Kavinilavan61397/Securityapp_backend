const Notification = require('../models/Notification');
const User = require('../models/User');
const Building = require('../models/Building');
const Visit = require('../models/Visit');
const Visitor = require('../models/Visitor');
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Notification Controller
 * Handles all notification-related operations including creation, delivery, and management
 */

// Create a new notification
const createNotification = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const {
      recipientId,
      recipientRole,
      title,
      message,
      type,
      category = 'INFO',
      priority = 'MEDIUM',
      isUrgent = false,
      relatedVisitId,
      relatedVisitorId,
      relatedUserId,
      actionRequired = false,
      actionType = 'NONE',
      actionDeadline,
      deliveryChannels = { inApp: true, email: false, sms: false, push: false },
      expiresAt,
      isPersistent = false,
      metadata = {}
    } = req.body;

    // Validate building access
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Validate related entities if provided
    if (relatedVisitId) {
      const visit = await Visit.findById(relatedVisitId);
      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Related visit not found'
        });
      }
    }

    if (relatedVisitorId) {
      const visitor = await Visitor.findById(relatedVisitorId);
      if (!visitor) {
        return res.status(404).json({
          success: false,
          message: 'Related visitor not found'
        });
      }
    }

    if (relatedUserId) {
      const user = await User.findById(relatedUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Related user not found'
        });
      }
    }

    // Create notification
    const notification = await Notification.create({
      notificationId: `NOTIF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      recipientId,
      recipientRole,
      buildingId,
      title,
      message,
      type,
      category,
      priority,
      isUrgent,
      relatedVisitId,
      relatedVisitorId,
      relatedUserId,
      actionRequired,
      actionType,
      actionDeadline: actionDeadline ? new Date(actionDeadline) : undefined,
      deliveryChannels,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isPersistent,
      metadata
    });

    // Populate related data
    await notification.populate([
      { path: 'recipientId', select: 'name email phoneNumber role' },
      { path: 'buildingId', select: 'name address' },
      { path: 'relatedVisitId', select: 'visitId purpose status' },
      { path: 'relatedVisitorId', select: 'name phoneNumber' },
      { path: 'relatedUserId', select: 'name role' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

// Get notifications for a user in a building
const getNotifications = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      priority, 
      unreadOnly = false,
      urgentOnly = false 
    } = req.query;
    const userId = req.user.id;

    // Build query
    const query = { 
      buildingId 
    };

    // Only filter by recipientId if user is not Super Admin
    if (req.user.role !== 'SUPER_ADMIN') {
      query.recipientId = userId;
    }

    if (status) {
      query.deliveryStatus = status;
    }

    if (type) {
      query.type = type;
    }

    if (priority) {
      query.priority = priority;
    }

    if (unreadOnly === 'true') {
      query.deliveryStatus = { $ne: 'READ' };
    }

    if (urgentOnly === 'true') {
      query.isUrgent = true;
    }

    // Add expiration filter
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get notifications
    const notifications = await Notification.find(query)
      .populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'relatedVisitId', select: 'visitId purpose status' },
        { path: 'relatedVisitorId', select: 'name phoneNumber' },
        { path: 'relatedUserId', select: 'name role' }
      ])
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalNotifications: total,
          hasNextPage: skip + notifications.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
};

// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const { buildingId, notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipientId: userId,
      buildingId
    }).populate([
      { path: 'recipientId', select: 'name email phoneNumber role' },
      { path: 'buildingId', select: 'name address' },
      { path: 'relatedVisitId', select: 'visitId purpose status' },
      { path: 'relatedVisitorId', select: 'name phoneNumber' },
      { path: 'relatedUserId', select: 'name role' }
    ]);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });

  } catch (error) {
    console.error('Get notification by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification',
      error: error.message
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { buildingId, notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipientId: userId,
      buildingId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsRead(userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Mark multiple notifications as read
const markMultipleAsRead = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { notificationIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notification IDs array is required'
      });
    }

    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        recipientId: userId,
        buildingId
      },
      {
        $set: {
          deliveryStatus: 'READ',
          readAt: new Date(),
          readBy: userId
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Mark multiple as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    // Get user's notifications stats
    const userStats = await Notification.aggregate([
      {
        $match: {
          recipientId: new mongoose.Types.ObjectId(userId),
          buildingId: new mongoose.Types.ObjectId(buildingId),
          ...(startDate && endDate ? {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          } : {})
        }
      },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          unreadNotifications: { 
            $sum: { $cond: [{ $ne: ['$deliveryStatus', 'READ'] }, 1, 0] } 
          },
          urgentNotifications: { 
            $sum: { $cond: [{ $eq: ['$isUrgent', true] }, 1, 0] } 
          },
          actionRequiredNotifications: { 
            $sum: { $cond: [{ $eq: ['$actionRequired', true] }, 1, 0] } 
          },
          byType: {
            $push: {
              type: '$type',
              status: '$deliveryStatus',
              priority: '$priority'
            }
          }
        }
      }
    ]);

    // Get building-wide stats (for admins)
    let buildingStats = null;
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'BUILDING_ADMIN') {
      buildingStats = await Notification.getNotificationStats(buildingId, startDate, endDate);
    }

    // Process type-based statistics
    const typeStats = {};
    if (userStats.length > 0 && userStats[0].byType) {
      userStats[0].byType.forEach(item => {
        if (!typeStats[item.type]) {
          typeStats[item.type] = { total: 0, unread: 0, urgent: 0 };
        }
        typeStats[item.type].total++;
        if (item.status !== 'READ') typeStats[item.type].unread++;
        if (item.priority === 'URGENT' || item.priority === 'CRITICAL') typeStats[item.type].urgent++;
      });
    }

    res.json({
      success: true,
      data: {
        userStats: userStats[0] || {
          totalNotifications: 0,
          unreadNotifications: 0,
          urgentNotifications: 0,
          actionRequiredNotifications: 0
        },
        buildingStats: buildingStats?.[0] || null,
        typeStats
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics',
      error: error.message
    });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id;

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      buildingId,
      deliveryStatus: { $ne: 'READ' },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    const urgentCount = await Notification.countDocuments({
      recipientId: userId,
      buildingId,
      isUrgent: true,
      deliveryStatus: { $ne: 'READ' },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    res.json({
      success: true,
      data: {
        unreadCount,
        urgentCount
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { buildingId, notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId,
      buildingId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Bulk delete notifications
const bulkDeleteNotifications = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { notificationIds, deleteAll = false, olderThan } = req.body;
    const userId = req.user.id;

    let query = {
      recipientId: userId,
      buildingId
    };

    if (deleteAll) {
      // Delete all read notifications
      query.deliveryStatus = 'READ';
    } else if (notificationIds && Array.isArray(notificationIds)) {
      query._id = { $in: notificationIds };
    } else if (olderThan) {
      query.createdAt = { $lt: new Date(olderThan) };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid delete parameters'
      });
    }

    const result = await Notification.deleteMany(query);

    res.json({
      success: true,
      message: `${result.deletedCount} notifications deleted successfully`,
      data: {
        deletedCount: result.deletedCount
      }
    });

  } catch (error) {
    console.error('Bulk delete notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notifications',
      error: error.message
    });
  }
};

// Search notifications
const searchNotifications = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { 
      q, 
      page = 1, 
      limit = 20, 
      type, 
      priority, 
      status,
      startDate,
      endDate
    } = req.query;
    const userId = req.user.id;

    // Build search query
    const query = { 
      buildingId 
    };

    // Only filter by recipientId if user is not Super Admin
    if (req.user.role !== 'SUPER_ADMIN') {
      query.recipientId = userId;
    }

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { message: { $regex: q, $options: 'i' } }
      ];
    }

    if (type) {
      query.type = type;
    }

    if (priority) {
      query.priority = priority;
    }

    if (status) {
      query.deliveryStatus = status;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Add expiration filter
    query.$and = [
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }
    ];

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Search notifications
    const notifications = await Notification.find(query)
      .populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'relatedVisitId', select: 'visitId purpose status' },
        { path: 'relatedVisitorId', select: 'name phoneNumber' },
        { path: 'relatedUserId', select: 'name role' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalNotifications: total,
          hasNextPage: skip + notifications.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Search notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search notifications',
      error: error.message
    });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  getNotificationById,
  markAsRead,
  markMultipleAsRead,
  getNotificationStats,
  getUnreadCount,
  deleteNotification,
  bulkDeleteNotifications,
  searchNotifications
};
