const Visit = require('../models/Visit');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Building = require('../models/Building');
const Notification = require('../models/Notification');
const Photo = require('../models/Photo');
const mongoose = require('mongoose');

/**
 * Analytics Controller
 * Provides comprehensive analytics and reporting for the visitor management system
 */

// Get building analytics overview
const getBuildingAnalytics = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate, period = '30d' } = req.query;

    // Calculate date range
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
      const start = new Date();
      start.setDate(start.getDate() - days);
      dateRange = {
        $gte: start,
        $lte: new Date()
      };
    }

    // Get building info
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Get visit analytics
    const visitAnalytics = await Visit.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          completedVisits: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          cancelledVisits: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
          inProgressVisits: { $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] } },
          scheduledVisits: { $sum: { $cond: [{ $eq: ['$status', 'SCHEDULED'] }, 1, 0] } },
          approvedVisits: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'APPROVED'] }, 1, 0] } },
          pendingVisits: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'PENDING'] }, 1, 0] } },
          rejectedVisits: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'REJECTED'] }, 1, 0] } },
          averageDuration: { $avg: '$actualDuration' },
          totalDuration: { $sum: '$actualDuration' }
        }
      }
    ]);

    // Get visitor analytics
    const visitorAnalytics = await Visitor.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: null,
          totalVisitors: { $sum: 1 },
          blacklistedVisitors: { $sum: { $cond: [{ $eq: ['$isBlacklisted', true] }, 1, 0] } },
          activeVisitors: { $sum: { $cond: [{ $eq: ['$isBlacklisted', false] }, 1, 0] } }
        }
      }
    ]);

    // Get user analytics
    const userAnalytics = await User.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId)
        }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get notification analytics
    const notificationAnalytics = await Notification.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          sentNotifications: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'SENT'] }, 1, 0] } },
          readNotifications: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'READ'] }, 1, 0] } },
          urgentNotifications: { $sum: { $cond: [{ $eq: ['$isUrgent', true] }, 1, 0] } }
        }
      }
    ]);

    // Get photo analytics
    const photoAnalytics = await Photo.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: null,
          totalPhotos: { $sum: 1 },
          totalSize: { $sum: '$size' },
          publicPhotos: { $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] } },
          privatePhotos: { $sum: { $cond: [{ $eq: ['$isPublic', false] }, 1, 0] } }
        }
      }
    ]);

    // Process user analytics into object
    const userStats = {};
    userAnalytics.forEach(stat => {
      userStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        building: {
          id: building._id,
          name: building.name,
          address: building.address
        },
        period: {
          startDate: dateRange.$gte,
          endDate: dateRange.$lte,
          period
        },
        visits: visitAnalytics[0] || {
          totalVisits: 0,
          completedVisits: 0,
          cancelledVisits: 0,
          inProgressVisits: 0,
          scheduledVisits: 0,
          approvedVisits: 0,
          pendingVisits: 0,
          rejectedVisits: 0,
          averageDuration: 0,
          totalDuration: 0
        },
        visitors: visitorAnalytics[0] || {
          totalVisitors: 0,
          blacklistedVisitors: 0,
          activeVisitors: 0
        },
        users: userStats,
        notifications: notificationAnalytics[0] || {
          totalNotifications: 0,
          sentNotifications: 0,
          readNotifications: 0,
          urgentNotifications: 0
        },
        photos: photoAnalytics[0] || {
          totalPhotos: 0,
          totalSize: 0,
          publicPhotos: 0,
          privatePhotos: 0
        }
      }
    });

  } catch (error) {
    console.error('Get building analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get building analytics',
      error: error.message
    });
  }
};

// Get visit trends and patterns
const getVisitTrends = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Calculate date range
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      dateRange = {
        $gte: start,
        $lte: new Date()
      };
    }

    // Determine group format based on groupBy
    let groupFormat;
    switch (groupBy) {
      case 'hour':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'day':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'week':
        groupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default:
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    // Get visit trends
    const visitTrends = await Visit.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: groupFormat,
          totalVisits: { $sum: 1 },
          completedVisits: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          cancelledVisits: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
          averageDuration: { $avg: '$actualDuration' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
      }
    ]);

    // Get purpose distribution
    const purposeDistribution = await Visit.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: '$purpose',
          count: { $sum: 1 },
          averageDuration: { $avg: '$actualDuration' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get hourly distribution
    const hourlyDistribution = await Visit.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get day of week distribution
    const dayOfWeekDistribution = await Visit.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        trends: visitTrends,
        purposeDistribution,
        hourlyDistribution,
        dayOfWeekDistribution,
        period: {
          startDate: dateRange.$gte,
          endDate: dateRange.$lte,
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('Get visit trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get visit trends',
      error: error.message
    });
  }
};

// Get security analytics
const getSecurityAnalytics = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;

    // Calculate date range
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      dateRange = {
        $gte: start,
        $lte: new Date()
      };
    }

    // Get check-in/out analytics
    const checkInOutAnalytics = await Visit.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange,
          status: 'COMPLETED'
        }
      },
      {
        $group: {
          _id: null,
          totalCheckIns: { $sum: 1 },
          averageCheckInTime: { $avg: { $hour: '$checkInTime' } },
          averageCheckOutTime: { $avg: { $hour: '$checkOutTime' } },
          averageDuration: { $avg: '$actualDuration' },
          totalDuration: { $sum: '$actualDuration' }
        }
      }
    ]);

    // Get security personnel activity
    const securityActivity = await Visit.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange,
          $or: [
            { checkInVerifiedBy: { $exists: true } },
            { checkOutVerifiedBy: { $exists: true } }
          ]
        }
      },
      {
        $group: {
          _id: '$checkInVerifiedBy',
          checkIns: { $sum: { $cond: [{ $ne: ['$checkInVerifiedBy', null] }, 1, 0] } },
          checkOuts: { $sum: { $cond: [{ $ne: ['$checkOutVerifiedBy', null] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'securityUser'
        }
      },
      {
        $unwind: {
          path: '$securityUser',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          securityUserId: '$_id',
          securityUserName: '$securityUser.name',
          checkIns: 1,
          checkOuts: 1,
          totalActivity: { $add: ['$checkIns', '$checkOuts'] }
        }
      },
      {
        $sort: { totalActivity: -1 }
      }
    ]);

    // Get blacklisted visitor activity
    const blacklistAnalytics = await Visitor.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          isBlacklisted: true,
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: null,
          totalBlacklisted: { $sum: 1 },
          blacklistedThisPeriod: { $sum: 1 }
        }
      }
    ]);

    // Get security alerts and notifications
    const securityAlerts = await Notification.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          type: 'SECURITY_ALERT',
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: null,
          totalAlerts: { $sum: 1 },
          urgentAlerts: { $sum: { $cond: [{ $eq: ['$isUrgent', true] }, 1, 0] } },
          readAlerts: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'READ'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        checkInOut: checkInOutAnalytics[0] || {
          totalCheckIns: 0,
          averageCheckInTime: 0,
          averageCheckOutTime: 0,
          averageDuration: 0,
          totalDuration: 0
        },
        securityActivity,
        blacklist: blacklistAnalytics[0] || {
          totalBlacklisted: 0,
          blacklistedThisPeriod: 0
        },
        alerts: securityAlerts[0] || {
          totalAlerts: 0,
          urgentAlerts: 0,
          readAlerts: 0
        },
        period: {
          startDate: dateRange.$gte,
          endDate: dateRange.$lte
        }
      }
    });

  } catch (error) {
    console.error('Get security analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security analytics',
      error: error.message
    });
  }
};

// Get user activity analytics
const getUserActivityAnalytics = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;

    // Calculate date range
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      dateRange = {
        $gte: start,
        $lte: new Date()
      };
    }

    // Get user activity by role
    const userActivity = await User.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId)
        }
      },
      {
        $group: {
          _id: '$role',
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: [{ $ne: ['$lastLoginAt', null] }, 1, 0] } }
        }
      }
    ]);

    // Get notification engagement
    const notificationEngagement = await Notification.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId),
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: '$recipientRole',
          totalSent: { $sum: 1 },
          totalRead: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'READ'] }, 1, 0] } },
          totalUrgent: { $sum: { $cond: [{ $eq: ['$isUrgent', true] }, 1, 0] } }
        }
      }
    ]);

    // Get most active users
    const mostActiveUsers = await User.aggregate([
      {
        $match: {
          buildingId: new mongoose.Types.ObjectId(buildingId)
        }
      },
      {
        $lookup: {
          from: 'visits',
          localField: '_id',
          foreignField: 'hostId',
          as: 'hostedVisits'
        }
      },
      {
        $lookup: {
          from: 'visits',
          localField: '_id',
          foreignField: 'checkInVerifiedBy',
          as: 'verifiedCheckIns'
        }
      },
      {
        $lookup: {
          from: 'visits',
          localField: '_id',
          foreignField: 'checkOutVerifiedBy',
          as: 'verifiedCheckOuts'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          hostedVisits: { $size: '$hostedVisits' },
          verifiedCheckIns: { $size: '$verifiedCheckIns' },
          verifiedCheckOuts: { $size: '$verifiedCheckOuts' },
          totalActivity: {
            $add: [
              { $size: '$hostedVisits' },
              { $size: '$verifiedCheckIns' },
              { $size: '$verifiedCheckOuts' }
            ]
          }
        }
      },
      {
        $sort: { totalActivity: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        userActivity,
        notificationEngagement,
        mostActiveUsers,
        period: {
          startDate: dateRange.$gte,
          endDate: dateRange.$lte
        }
      }
    });

  } catch (error) {
    console.error('Get user activity analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user activity analytics',
      error: error.message
    });
  }
};

// Get system performance metrics
const getSystemPerformanceMetrics = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;

    // Calculate date range
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      dateRange = {
        $gte: start,
        $lte: new Date()
      };
    }

    // Get system usage metrics
    const systemMetrics = await Promise.all([
      // Visit processing time
      Visit.aggregate([
        {
          $match: {
            buildingId: new mongoose.Types.ObjectId(buildingId),
            createdAt: dateRange,
            status: 'COMPLETED'
          }
        },
        {
          $group: {
            _id: null,
            averageProcessingTime: { $avg: '$actualDuration' },
            totalProcessingTime: { $sum: '$actualDuration' },
            fastestVisit: { $min: '$actualDuration' },
            slowestVisit: { $max: '$actualDuration' }
          }
        }
      ]),
      
      // Notification delivery metrics
      Notification.aggregate([
        {
          $match: {
            buildingId: new mongoose.Types.ObjectId(buildingId),
            createdAt: dateRange
          }
        },
        {
          $group: {
            _id: null,
            totalNotifications: { $sum: 1 },
            deliverySuccessRate: {
              $avg: {
                $cond: [
                  { $in: ['$deliveryStatus', ['SENT', 'DELIVERED', 'READ']] },
                  1,
                  0
                ]
              }
            },
            averageDeliveryTime: {
              $avg: {
                $cond: [
                  { $ne: ['$sentAt', null] },
                  { $subtract: ['$sentAt', '$createdAt'] },
                  null
                ]
              }
            }
          }
        }
      ]),

      // Photo storage metrics
      Photo.aggregate([
        {
          $match: {
            buildingId: new mongoose.Types.ObjectId(buildingId),
            createdAt: dateRange
          }
        },
        {
          $group: {
            _id: null,
            totalPhotos: { $sum: 1 },
            totalStorageUsed: { $sum: '$size' },
            averagePhotoSize: { $avg: '$size' },
            largestPhoto: { $max: '$size' },
            smallestPhoto: { $min: '$size' }
          }
        }
      ])
    ]);

    // Get error rates
    const errorMetrics = await Promise.all([
      // Visit error rates
      Visit.aggregate([
        {
          $match: {
            buildingId: new mongoose.Types.ObjectId(buildingId),
            createdAt: dateRange
          }
        },
        {
          $group: {
            _id: null,
            totalVisits: { $sum: 1 },
            cancelledVisits: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
            rejectedVisits: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'REJECTED'] }, 1, 0] } }
          }
        }
      ]),

      // Notification failure rates
      Notification.aggregate([
        {
          $match: {
            buildingId: new mongoose.Types.ObjectId(buildingId),
            createdAt: dateRange
          }
        },
        {
          $group: {
            _id: null,
            totalNotifications: { $sum: 1 },
            failedNotifications: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'FAILED'] }, 1, 0] } },
            retryCount: { $avg: '$retryCount' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        performance: {
          visits: systemMetrics[0][0] || {
            averageProcessingTime: 0,
            totalProcessingTime: 0,
            fastestVisit: 0,
            slowestVisit: 0
          },
          notifications: systemMetrics[1][0] || {
            totalNotifications: 0,
            deliverySuccessRate: 0,
            averageDeliveryTime: 0
          },
          photos: systemMetrics[2][0] || {
            totalPhotos: 0,
            totalStorageUsed: 0,
            averagePhotoSize: 0,
            largestPhoto: 0,
            smallestPhoto: 0
          }
        },
        errors: {
          visits: errorMetrics[0][0] || {
            totalVisits: 0,
            cancelledVisits: 0,
            rejectedVisits: 0
          },
          notifications: errorMetrics[1][0] || {
            totalNotifications: 0,
            failedNotifications: 0,
            retryCount: 0
          }
        },
        period: {
          startDate: dateRange.$gte,
          endDate: dateRange.$lte
        }
      }
    });

  } catch (error) {
    console.error('Get system performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system performance metrics',
      error: error.message
    });
  }
};

module.exports = {
  getBuildingAnalytics,
  getVisitTrends,
  getSecurityAnalytics,
  getUserActivityAnalytics,
  getSystemPerformanceMetrics
};
