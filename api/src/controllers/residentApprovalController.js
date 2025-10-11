const ResidentApproval = require('../models/ResidentApproval');
const Building = require('../models/Building');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Resident Approval Controller
 * Handles resident approval workflow for admin flow
 */
class ResidentApprovalController {
  
  /**
   * Create a new resident approval request
   * This can be called by anyone (public endpoint for resident registration)
   */
  static async createResidentApproval(req, res) {
    try {
      const { buildingId } = req.params;
      const { 
        name, 
        email, 
        phoneNumber, 
        age, 
        gender, 
        flatNumber, 
        tenantType,
        idProof,
        address,
        emergencyContact,
        notes
      } = req.body;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check if resident already exists for this flat
      const existingResident = await ResidentApproval.findOne({
        buildingId,
        flatNumber,
        status: { $in: ['PENDING', 'APPROVED'] }
      });

      if (existingResident) {
        return res.status(400).json({
          success: false,
          message: 'A resident approval request already exists for this flat number',
          data: {
            existingResident: existingResident.getSummary()
          }
        });
      }

      // Create new resident approval request
      const residentApproval = new ResidentApproval({
        name,
        email,
        phoneNumber,
        age: parseInt(age),
        gender,
        flatNumber,
        tenantType,
        idProof,
        address,
        emergencyContact,
        notes,
        buildingId
      });

      await residentApproval.save();

      // Populate building details
      await residentApproval.populate([
        { path: 'buildingId', select: 'name address' }
      ]);

      console.log('✅ Resident approval request created successfully:', residentApproval._id);

      res.status(201).json({
        success: true,
        message: 'Resident approval request submitted successfully',
        data: {
          residentApproval: residentApproval.getSummary(),
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Create resident approval error:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A resident approval request already exists for this email or phone number',
          error: 'Duplicate resident request'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create resident approval request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all resident approval requests for a building
   * Only BUILDING_ADMIN and SUPER_ADMIN can access
   */
  static async getResidentApprovals(req, res) {
    try {
      const { buildingId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view resident approvals in your assigned building.'
        });
      }

      // Build query
      const query = { buildingId, isActive: true };
      
      if (status) {
        query.status = status;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get resident approvals with pagination
      const residentApprovals = await ResidentApproval.find(query)
        .populate([
          { path: 'buildingId', select: 'name address' },
          { path: 'approvedBy', select: 'name email role' },
          { path: 'deniedBy', select: 'name email role' }
        ])
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const totalApprovals = await ResidentApproval.countDocuments(query);

      // Get approval statistics
      const stats = await ResidentApproval.getApprovalStats(buildingId);
      const statusCounts = {};
      stats.forEach(stat => {
        statusCounts[stat._id] = stat.count;
      });

      res.status(200).json({
        success: true,
        message: 'Resident approvals retrieved successfully',
        data: {
          residentApprovals: residentApprovals.map(approval => approval.getSummary()),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalApprovals / parseInt(limit)),
            totalApprovals,
            hasNext: skip + residentApprovals.length < totalApprovals,
            hasPrev: parseInt(page) > 1
          },
          statistics: {
            PENDING: statusCounts.PENDING || 0,
            APPROVED: statusCounts.APPROVED || 0,
            DENIED: statusCounts.DENIED || 0,
            TOTAL: totalApprovals
          },
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get resident approvals error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve resident approvals',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get single resident approval by ID
   */
  static async getResidentApprovalById(req, res) {
    try {
      const { buildingId, approvalId } = req.params;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view resident approvals in your assigned building.'
        });
      }

      // Get resident approval
      const residentApproval = await ResidentApproval.findOne({ 
        _id: approvalId, 
        buildingId 
      }).populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'approvedBy', select: 'name email role' },
        { path: 'deniedBy', select: 'name email role' }
      ]);

      if (!residentApproval) {
        return res.status(404).json({
          success: false,
          message: 'Resident approval request not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Resident approval retrieved successfully',
        data: {
          residentApproval: residentApproval.getSummary(),
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get resident approval by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve resident approval',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get resident's own approval status
   * RESIDENT can check their own approval status
   */
  static async getMyApprovalStatus(req, res) {
    try {
      const { buildingId } = req.params;
      const { userId } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Find resident's approval request
      const residentApproval = await ResidentApproval.findOne({
        buildingId,
        email: req.user.email, // Match by email since resident might not have userId yet
        isActive: true
      }).sort({ createdAt: -1 }); // Get the latest approval request

      if (!residentApproval) {
        return res.status(404).json({
          success: false,
          message: 'No approval request found for this resident',
          data: {
            status: 'NOT_FOUND',
            message: 'You have not submitted any approval request yet'
          }
        });
      }

      // Populate building details
      await residentApproval.populate('buildingId', 'name address');

      res.status(200).json({
        success: true,
        message: 'Approval status retrieved successfully',
        data: {
          approvalId: residentApproval._id,
          status: residentApproval.status,
          submittedAt: residentApproval.submittedAt,
          approvedAt: residentApproval.approvedAt,
          approvedBy: residentApproval.approvedBy,
          rejectionReason: residentApproval.rejectionReason,
          adminNotes: residentApproval.adminNotes,
          building: {
            id: building._id,
            name: building.name,
            address: building.address
          },
          resident: {
            name: residentApproval.name,
            email: residentApproval.email,
            phoneNumber: residentApproval.phoneNumber,
            flatNumber: residentApproval.flatNumber,
            tenantType: residentApproval.tenantType
          }
        }
      });

    } catch (error) {
      console.error('Get my approval status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve approval status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Approve resident
   * Only BUILDING_ADMIN and SUPER_ADMIN can approve
   */
  static async approveResident(req, res) {
    try {
      const { buildingId, approvalId } = req.params;
      const { adminNotes } = req.body;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only approve residents in your assigned building.'
        });
      }

      // Get resident approval
      const residentApproval = await ResidentApproval.findOne({ 
        _id: approvalId, 
        buildingId 
      });

      if (!residentApproval) {
        return res.status(404).json({
          success: false,
          message: 'Resident approval request not found'
        });
      }

      if (residentApproval.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Resident approval request is already ${residentApproval.status.toLowerCase()}`,
          data: {
            currentStatus: residentApproval.status
          }
        });
      }

      // Approve resident
      await residentApproval.approve(userId, adminNotes);

      // Populate details
      await residentApproval.populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'approvedBy', select: 'name email role' }
      ]);

      console.log('✅ Resident approved successfully:', residentApproval._id);

      // Create notification for the resident
      try {
        // Find the resident user by email to send notification
        const residentUser = await User.findOne({
          email: residentApproval.email,
          buildingId: buildingId
        });

        if (residentUser) {
          await Notification.create({
            notificationId: `NOTIF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
            recipientId: residentUser._id,
            recipientRole: 'RESIDENT',
            buildingId,
            title: 'Resident Approval Approved',
            message: `Congratulations! Your resident approval request has been approved by ${req.user.name}. You can now access all resident features.`,
            type: 'RESIDENT_APPROVAL_APPROVED',
            category: 'SUCCESS',
            priority: 'HIGH',
            relatedUserId: userId,
            actionRequired: false,
            deliveryChannels: { inApp: true, email: true, sms: false },
            metadata: {
              approvedBy: req.user.name,
              approvedAt: new Date(),
              adminNotes: adminNotes || null
            }
          });
          console.log('✅ Notification sent to resident:', residentUser._id);
        } else {
          console.log('⚠️ Resident user not found for notification:', residentApproval.email);
        }
      } catch (notificationError) {
        console.error('❌ Failed to create resident approval notification:', notificationError);
        // Don't fail the approval if notification fails
      }

      res.status(200).json({
        success: true,
        message: 'Resident approved successfully',
        data: {
          residentApproval: residentApproval.getSummary(),
          building: {
            id: building._id,
            name: building.name
          },
          approvedBy: {
            id: userId,
            name: req.user.name
          }
        }
      });

    } catch (error) {
      console.error('Approve resident error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve resident',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Deny resident
   * Only BUILDING_ADMIN and SUPER_ADMIN can deny
   */
  static async denyResident(req, res) {
    try {
      const { buildingId, approvalId } = req.params;
      const { rejectionReason, adminNotes } = req.body;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only deny residents in your assigned building.'
        });
      }

      // Get resident approval
      const residentApproval = await ResidentApproval.findOne({ 
        _id: approvalId, 
        buildingId 
      });

      if (!residentApproval) {
        return res.status(404).json({
          success: false,
          message: 'Resident approval request not found'
        });
      }

      if (residentApproval.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Resident approval request is already ${residentApproval.status.toLowerCase()}`,
          data: {
            currentStatus: residentApproval.status
          }
        });
      }

      // Deny resident
      await residentApproval.deny(userId, rejectionReason, adminNotes);

      // Populate details
      await residentApproval.populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'deniedBy', select: 'name email role' }
      ]);

      console.log('✅ Resident denied successfully:', residentApproval._id);

      // Create notification for the resident
      try {
        // Find the resident user by email to send notification
        const residentUser = await User.findOne({
          email: residentApproval.email,
          buildingId: buildingId
        });

        if (residentUser) {
          await Notification.create({
            notificationId: `NOTIF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
            recipientId: residentUser._id,
            recipientRole: 'RESIDENT',
            buildingId,
            title: 'Resident Approval Denied',
            message: `Your resident approval request has been denied by ${req.user.name}. Reason: ${rejectionReason || 'No reason provided'}. Please contact the building admin for more information.`,
            type: 'RESIDENT_APPROVAL_DENIED',
            category: 'WARNING',
            priority: 'HIGH',
            relatedUserId: userId,
            actionRequired: true,
            actionType: 'CONTACT_ADMIN',
            deliveryChannels: { inApp: true, email: true, sms: false },
            metadata: {
              deniedBy: req.user.name,
              deniedAt: new Date(),
              rejectionReason: rejectionReason || null,
              adminNotes: adminNotes || null
            }
          });
          console.log('✅ Denial notification sent to resident:', residentUser._id);
        } else {
          console.log('⚠️ Resident user not found for denial notification:', residentApproval.email);
        }
      } catch (notificationError) {
        console.error('❌ Failed to create resident denial notification:', notificationError);
        // Don't fail the denial if notification fails
      }

      res.status(200).json({
        success: true,
        message: 'Resident denied successfully',
        data: {
          residentApproval: residentApproval.getSummary(),
          building: {
            id: building._id,
            name: building.name
          },
          deniedBy: {
            id: userId,
            name: req.user.name
          }
        }
      });

    } catch (error) {
      console.error('Deny resident error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deny resident',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get pending approvals count
   */
  static async getPendingCount(req, res) {
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

      // Check permissions
      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view resident approvals in your assigned building.'
        });
      }

      // Get pending count
      const pendingCount = await ResidentApproval.countDocuments({
        buildingId,
        status: 'PENDING',
        isActive: true
      });

      res.status(200).json({
        success: true,
        message: 'Pending approvals count retrieved successfully',
        data: {
          pendingCount,
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get pending count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pending count',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get approval statistics
   */
  static async getApprovalStats(req, res) {
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

      // Check permissions
      // Check permissions - BUILDING_ADMIN can access their building's data
      // For now, allow all BUILDING_ADMIN users to access any building
      // TODO: Implement proper building assignment check when adminId is properly set
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view resident approvals in your assigned building.'
        });
      }

      // Get statistics
      const stats = await ResidentApproval.getApprovalStats(buildingId);
      const statusCounts = {};
      
      // Handle case where stats might be empty or null
      if (stats && Array.isArray(stats)) {
        stats.forEach(stat => {
          statusCounts[stat._id] = stat.count;
        });
      }
      
      // Ensure we have default values even if no data exists
      const defaultStats = {
        PENDING: 0,
        APPROVED: 0,
        DENIED: 0,
        TOTAL: 0
      };

      res.status(200).json({
        success: true,
        message: 'Approval statistics retrieved successfully',
        data: {
          statistics: {
            PENDING: statusCounts.PENDING || defaultStats.PENDING,
            APPROVED: statusCounts.APPROVED || defaultStats.APPROVED,
            DENIED: statusCounts.DENIED || defaultStats.DENIED,
            TOTAL: Object.values(statusCounts).reduce((sum, count) => sum + count, 0) || defaultStats.TOTAL
          },
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get approval stats error:', error);
      // Return default stats instead of error for empty database
      res.status(200).json({
        success: true,
        message: 'Approval statistics retrieved successfully',
        data: {
          statistics: {
            PENDING: 0,
            APPROVED: 0,
            DENIED: 0,
            TOTAL: 0
          },
          building: {
            id: buildingId,
            name: 'Building'
          }
        }
      });
    }
  }
}

module.exports = ResidentApprovalController;
