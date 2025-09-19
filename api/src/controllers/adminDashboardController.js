const Building = require('../models/Building');
const User = require('../models/User');
const Visit = require('../models/Visit');
const Visitor = require('../models/Visitor');
const Employee = require('../models/Employee');
const ResidentApproval = require('../models/ResidentApproval');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

/**
 * Admin Dashboard Controller
 * Handles admin dashboard data for the admin flow
 */
class AdminDashboardController {
  
  /**
   * Get admin dashboard overview
   * Based on Figma "Admin Dashboard" screen
   */
  static async getAdminDashboard(req, res) {
    try {
      const { buildingId } = req.params;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get dashboard statistics
      const [
        totalResidents,
        totalEmployees,
        totalVisitors,
        todayVisits,
        pendingApprovals,
        recentNotifications
      ] = await Promise.all([
        // Total residents
        User.countDocuments({ buildingId, role: 'RESIDENT', isActive: true }),
        
        // Total employees
        Employee.countDocuments({ buildingId, isActive: true }),
        
        // Total visitors
        Visitor.countDocuments({ buildingId, isActive: true }),
        
        // Today's visits
        Visit.countDocuments({ 
          buildingId, 
          createdAt: { $gte: startOfDay, $lt: endOfDay } 
        }),
        
        // Pending resident approvals
        ResidentApproval.countDocuments({ 
          buildingId, 
          status: 'PENDING', 
          isActive: true 
        }),
        
        // Recent notifications (last 5)
        Notification.find({ 
          buildingId,
          recipientRole: { $in: ['BUILDING_ADMIN', 'SUPER_ADMIN'] }
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate([
          { path: 'recipientId', select: 'name email role' },
          { path: 'relatedVisitId', select: 'visitId purpose' },
          { path: 'relatedVisitorId', select: 'name phoneNumber' }
        ])
      ]);

      // Get recent activity (last 10 visits)
      const recentActivity = await Visit.find({ buildingId })
        .populate([
          { path: 'visitorId', select: 'name phoneNumber visitorCategory' },
          { path: 'hostId', select: 'name phoneNumber' }
        ])
        .sort({ createdAt: -1 })
        .limit(10);

      // Format recent activity by category
      const activityByCategory = {
        CABS: recentActivity.filter(visit => 
          visit.visitorId.visitorCategory === 'CAB_DRIVER'
        ).slice(0, 3),
        DELIVERY: recentActivity.filter(visit => 
          visit.visitorId.visitorCategory === 'DELIVERY_AGENT'
        ).slice(0, 3),
        EMPLOYEES: recentActivity.filter(visit => 
          visit.visitorId.visitorCategory === 'FLAT_EMPLOYEE'
        ).slice(0, 3),
        OTHERS: recentActivity.filter(visit => 
          visit.visitorId.visitorCategory === 'OTHER'
        ).slice(0, 3)
      };

      // Get quick actions data
      const quickActions = {
        todayVisits: {
          count: todayVisits,
          label: "Today's Visits",
          icon: "visits"
        },
        postForResident: {
          count: 0, // Will be implemented with message system
          label: "Post for Resident",
          icon: "post"
        },
        contactGuards: {
          count: await Employee.countDocuments({ 
            buildingId, 
            employeeType: 'SECURITY_GUARD', 
            isActive: true 
          }),
          label: "Contact Guards",
          icon: "guards"
        }
      };

      res.status(200).json({
        success: true,
        message: 'Admin dashboard retrieved successfully',
        data: {
          user: {
            id: userId,
            name: req.user.name,
            role: role,
            roleDisplay: role === 'BUILDING_ADMIN' ? 'Admin' : 'Super Admin'
          },
          building: {
            id: building._id,
            name: building.name,
            address: building.address
          },
          statistics: {
            totalResidents,
            totalEmployees,
            totalVisitors,
            todayVisits,
            pendingApprovals
          },
          quickActions,
          recentActivity: activityByCategory,
          recentNotifications: recentNotifications.map(notification => ({
            id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            category: notification.category,
            priority: notification.priority,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
            relatedVisit: notification.relatedVisitId ? {
              visitId: notification.relatedVisitId.visitId,
              purpose: notification.relatedVisitId.purpose
            } : null,
            relatedVisitor: notification.relatedVisitorId ? {
              name: notification.relatedVisitorId.name,
              phoneNumber: notification.relatedVisitorId.phoneNumber
            } : null
          })),
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('Get admin dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve admin dashboard',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get today's visits
   * Based on Figma "Today's Visits" quick action
   */
  static async getTodayVisits(req, res) {
    try {
      const { buildingId } = req.params;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view visits for your assigned building.'
        });
      }

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get today's visits
      const todayVisits = await Visit.find({ 
        buildingId, 
        createdAt: { $gte: startOfDay, $lt: endOfDay } 
      })
      .populate([
        { path: 'visitorId', select: 'name phoneNumber email visitorCategory serviceType vehicleNumber' },
        { path: 'hostId', select: 'name phoneNumber flatNumber' }
      ])
      .sort({ createdAt: -1 });

      // Group visits by status
      const visitsByStatus = {
        SCHEDULED: todayVisits.filter(visit => visit.status === 'SCHEDULED'),
        IN_PROGRESS: todayVisits.filter(visit => visit.status === 'IN_PROGRESS'),
        COMPLETED: todayVisits.filter(visit => visit.status === 'COMPLETED'),
        CANCELLED: todayVisits.filter(visit => visit.status === 'CANCELLED')
      };

      // Get visit statistics
      const visitStats = {
        total: todayVisits.length,
        scheduled: visitsByStatus.SCHEDULED.length,
        inProgress: visitsByStatus.IN_PROGRESS.length,
        completed: visitsByStatus.COMPLETED.length,
        cancelled: visitsByStatus.CANCELLED.length
      };

      res.status(200).json({
        success: true,
        message: 'Today\'s visits retrieved successfully',
        data: {
          visits: todayVisits.map(visit => ({
            id: visit._id,
            visitId: visit.visitId,
            visitor: {
              name: visit.visitorId.name,
              phoneNumber: visit.visitorId.phoneNumber,
              email: visit.visitorId.email,
              category: visit.visitorId.visitorCategory,
              serviceType: visit.visitorId.serviceType,
              vehicleNumber: visit.visitorId.vehicleNumber
            },
            host: {
              name: visit.hostId.name,
              phoneNumber: visit.hostId.phoneNumber,
              flatNumber: visit.hostId.flatNumber
            },
            purpose: visit.purpose,
            status: visit.status,
            approvalStatus: visit.approvalStatus,
            scheduledDate: visit.scheduledDate,
            scheduledTime: visit.scheduledTime,
            checkInTime: visit.checkInTime,
            checkOutTime: visit.checkOutTime,
            createdAt: visit.createdAt
          })),
          statistics: visitStats,
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get today visits error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve today\'s visits',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get recent activity
   * Based on Figma "Recent Activity" section
   */
  static async getRecentActivity(req, res) {
    try {
      const { buildingId } = req.params;
      const { category = 'CABS', limit = 10 } = req.query;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view activity for your assigned building.'
        });
      }

      // Build query based on category
      let visitorCategoryFilter = {};
      if (category === 'CABS') {
        visitorCategoryFilter = { visitorCategory: 'CAB_DRIVER' };
      } else if (category === 'DELIVERY') {
        visitorCategoryFilter = { visitorCategory: 'DELIVERY_AGENT' };
      } else if (category === 'EMPLOYEES') {
        visitorCategoryFilter = { visitorCategory: 'FLAT_EMPLOYEE' };
      } else if (category === 'OTHERS') {
        visitorCategoryFilter = { visitorCategory: 'OTHER' };
      }

      // Get recent activity
      const recentActivity = await Visit.find({ buildingId })
        .populate([
          { 
            path: 'visitorId', 
            select: 'name phoneNumber visitorCategory serviceType vehicleNumber',
            match: visitorCategoryFilter
          },
          { path: 'hostId', select: 'name phoneNumber flatNumber' }
        ])
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      // Filter out visits where visitorId is null (due to category filter)
      const filteredActivity = recentActivity.filter(visit => visit.visitorId);

      res.status(200).json({
        success: true,
        message: 'Recent activity retrieved successfully',
        data: {
          category: category.toUpperCase(),
          activity: filteredActivity.map(visit => ({
            id: visit._id,
            visitId: visit.visitId,
            visitor: {
              name: visit.visitorId.name,
              phoneNumber: visit.visitorId.phoneNumber,
              category: visit.visitorId.visitorCategory,
              serviceType: visit.visitorId.serviceType,
              vehicleNumber: visit.visitorId.vehicleNumber
            },
            host: {
              name: visit.hostId.name,
              phoneNumber: visit.hostId.phoneNumber,
              flatNumber: visit.hostId.flatNumber
            },
            purpose: visit.purpose,
            status: visit.status,
            checkInTime: visit.checkInTime,
            checkOutTime: visit.checkOutTime,
            createdAt: visit.createdAt,
            timeAgo: this.getTimeAgo(visit.createdAt)
          })),
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recent activity',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get quick actions
   * Based on Figma "Quick Actions" section
   */
  static async getQuickActions(req, res) {
    try {
      const { buildingId } = req.params;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view quick actions for your assigned building.'
        });
      }

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get quick actions data
      const [
        todayVisitsCount,
        securityGuardsCount,
        pendingApprovalsCount
      ] = await Promise.all([
        Visit.countDocuments({ 
          buildingId, 
          createdAt: { $gte: startOfDay, $lt: endOfDay } 
        }),
        Employee.countDocuments({ 
          buildingId, 
          employeeType: 'SECURITY_GUARD', 
          isActive: true 
        }),
        ResidentApproval.countDocuments({ 
          buildingId, 
          status: 'PENDING', 
          isActive: true 
        })
      ]);

      const quickActions = [
        {
          id: 'today-visits',
          title: 'Today\'s Visits',
          description: 'View and manage today\'s visitor activity',
          icon: 'visits',
          count: todayVisitsCount,
          color: '#dc2626',
          action: 'navigate',
          route: '/visits/today'
        },
        {
          id: 'post-resident',
          title: 'Post for Resident',
          description: 'Send messages and announcements to residents',
          icon: 'post',
          count: 0, // Will be updated with message system
          color: '#dc2626',
          action: 'navigate',
          route: '/messages/post'
        },
        {
          id: 'contact-guards',
          title: 'Contact Guards',
          description: 'Get in touch with security personnel',
          icon: 'guards',
          count: securityGuardsCount,
          color: '#dc2626',
          action: 'navigate',
          route: '/employees/security'
        },
        {
          id: 'pending-approvals',
          title: 'Pending Approvals',
          description: 'Review resident approval requests',
          icon: 'approvals',
          count: pendingApprovalsCount,
          color: '#dc2626',
          action: 'navigate',
          route: '/residents/pending'
        }
      ];

      res.status(200).json({
        success: true,
        message: 'Quick actions retrieved successfully',
        data: {
          quickActions,
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get quick actions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve quick actions',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Helper method to calculate time ago
   */
  static getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }
}

module.exports = AdminDashboardController;
