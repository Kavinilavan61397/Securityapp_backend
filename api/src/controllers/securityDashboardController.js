const Visit = require('../models/Visit');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Security Dashboard Controller
 * Handles security-specific dashboard data and quick actions
 */
class SecurityDashboardController {

  /**
   * Get security dashboard overview
   * GET /api/security/dashboard/:buildingId
   */
  static async getDashboard(req, res) {
    try {
      const { buildingId } = req.params;
      const { userId } = req.user;

      // Get security user details
      const securityUser = await User.findById(userId)
        .populate('buildingId', 'name address');

      if (!securityUser) {
        return res.status(404).json({
          success: false,
          message: 'Security user not found'
        });
      }

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Get today's visits count
      const todayVisits = await Visit.countDocuments({
        buildingId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        isActive: true
      });

      // Get pending approvals count
      const pendingApprovals = await Visit.countDocuments({
        buildingId,
        approvalStatus: 'PENDING',
        isActive: true
      });

      // Get active visits (checked in but not checked out)
      const activeVisits = await Visit.countDocuments({
        buildingId,
        status: 'IN_PROGRESS',
        isActive: true
      });

      // Get recent activity (last 10 check-ins)
      const recentActivity = await Visit.find({
        buildingId,
        checkInTime: { $exists: true },
        isActive: true
      })
      .populate('visitorId', 'name visitorCategory serviceType vehicleNumber')
      .sort({ checkInTime: -1 })
      .limit(10);

      // Categorize recent activity
      const activityByCategory = {
        cabs: recentActivity.filter(visit => visit.visitorId.visitorCategory === 'CAB_DRIVER'),
        delivery: recentActivity.filter(visit => visit.visitorId.visitorCategory === 'DELIVERY_AGENT'),
        employees: recentActivity.filter(visit => visit.visitorId.visitorCategory === 'FLAT_EMPLOYEE')
      };

      res.status(200).json({
        success: true,
        data: {
          user: {
            name: securityUser.name,
            employeeCode: securityUser.employeeCode,
            building: securityUser.buildingId
          },
          quickStats: {
            todayVisits,
            pendingApprovals,
            activeVisits
          },
          recentActivity: activityByCategory
        }
      });

    } catch (error) {
      console.error('Get security dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get today's visits
   * GET /api/security/today-visits/:buildingId
   */
  static async getTodayVisits(req, res) {
    try {
      const { buildingId } = req.params;
      const { page = 1, limit = 20, category } = req.query;
      const skip = (page - 1) * limit;

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Build query
      let query = {
        buildingId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        isActive: true
      };

      // Filter by category if provided
      if (category) {
        query['visitorId.visitorCategory'] = category;
      }

      const visits = await Visit.find(query)
        .populate('visitorId', 'name phoneNumber visitorCategory serviceType vehicleNumber')
        .populate('hostId', 'name flatNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Visit.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          visits,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get today visits error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get recent activity by category
   * GET /api/security/recent-activity/:buildingId
   */
  static async getRecentActivity(req, res) {
    try {
      const { buildingId } = req.params;
      const { category, limit = 20 } = req.query;

      let query = {
        buildingId,
        checkInTime: { $exists: true },
        isActive: true
      };

      // Filter by category if provided
      if (category) {
        query['visitorId.visitorCategory'] = category;
      }

      const activities = await Visit.find(query)
        .populate('visitorId', 'name visitorCategory serviceType vehicleNumber')
        .populate('hostId', 'name flatNumber')
        .sort({ checkInTime: -1 })
        .limit(parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          activities,
          category: category || 'ALL'
        }
      });

    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get quick actions data
   * GET /api/security/quick-actions/:buildingId
   */
  static async getQuickActions(req, res) {
    try {
      const { buildingId } = req.params;

      // Get counts for quick actions
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const [
        todayVisitsCount,
        pendingApprovalsCount,
        activeVisitsCount,
        unreadNotificationsCount
      ] = await Promise.all([
        Visit.countDocuments({
          buildingId,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          isActive: true
        }),
        Visit.countDocuments({
          buildingId,
          approvalStatus: 'PENDING',
          isActive: true
        }),
        Visit.countDocuments({
          buildingId,
          status: 'IN_PROGRESS',
          isActive: true
        }),
        Notification.countDocuments({
          buildingId,
          recipientRole: 'SECURITY',
          isRead: false
        })
      ]);

      res.status(200).json({
        success: true,
        data: {
          addVisitor: {
            enabled: true,
            description: 'Register a new visitor'
          },
          todayVisits: {
            enabled: true,
            count: todayVisitsCount,
            description: 'View today\'s visits'
          },
          contactAdmin: {
            enabled: true,
            description: 'Contact building administrator'
          },
          pendingApprovals: {
            enabled: pendingApprovalsCount > 0,
            count: pendingApprovalsCount,
            description: 'Pending visit approvals'
          },
          activeVisits: {
            enabled: activeVisitsCount > 0,
            count: activeVisitsCount,
            description: 'Currently active visits'
          },
          notifications: {
            enabled: unreadNotificationsCount > 0,
            count: unreadNotificationsCount,
            description: 'Unread notifications'
          }
        }
      });

    } catch (error) {
      console.error('Get quick actions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = SecurityDashboardController;
