const PreApproval = require('../models/PreApproval');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Building = require('../models/Building');

/**
 * PreApproval Controller
 * Handles all pre-approval related operations
 * Robust error handling and comprehensive validation
 */
class PreApprovalController {
  
  /**
   * Create Pre-Approval
   * POST /api/pre-approvals/:buildingId
   */
  async createPreApproval(req, res) {
    try {
      const { buildingId } = req.params;
      const { visitorId, purpose, validUntil, maxUsage, notes, isEmergencyContact, autoApprove, notifyOnArrival, securityNotes } = req.body;
      const userId = req.user.userId;

      // Validate building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Validate visitor exists
      const visitor = await Visitor.findById(visitorId);
      if (!visitor) {
        return res.status(404).json({
          success: false,
          message: 'Visitor not found'
        });
      }

      // Check if visitor belongs to this building
      if (visitor.buildingId.toString() !== buildingId) {
        return res.status(400).json({
          success: false,
          message: 'Visitor does not belong to this building'
        });
      }

      // Check for existing active pre-approval
      const existingPreApproval = await PreApproval.findOne({
        visitorId,
        buildingId,
        residentId: userId,
        status: 'ACTIVE',
        validUntil: { $gt: new Date() }
      });

      if (existingPreApproval) {
        return res.status(400).json({
          success: false,
          message: 'Visitor already has an active pre-approval'
        });
      }

      // Create pre-approval
      const preApproval = new PreApproval({
        visitorId,
        residentId: userId,
        buildingId,
        purpose,
        validUntil: new Date(validUntil),
        maxUsage: maxUsage || 1,
        notes,
        isEmergencyContact: isEmergencyContact || false,
        autoApprove: autoApprove || false,
        notifyOnArrival: notifyOnArrival !== false,
        securityNotes,
        approvedBy: userId
      });

      await preApproval.save();

      // Populate references
      await preApproval.populate([
        { path: 'visitorId', select: 'name phoneNumber email' },
        { path: 'residentId', select: 'name email phoneNumber' },
        { path: 'approvedBy', select: 'name email' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Pre-approval created successfully',
        data: {
          preApproval
        }
      });

    } catch (error) {
      console.error('Create pre-approval error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get All Pre-Approvals
   * GET /api/pre-approvals/:buildingId
   */
  async getPreApprovals(req, res) {
    try {
      const { buildingId } = req.params;
      const { status, page = 1, limit = 10, search } = req.query;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Build query
      let query = { buildingId };

      // Filter by status
      if (status) {
        query.status = status;
      }

      // For residents, only show their pre-approvals
      if (userRole === 'RESIDENT') {
        query.residentId = userId;
      }

      // Search functionality
      if (search) {
        query.$or = [
          { purpose: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get pre-approvals with pagination
      const preApprovals = await PreApproval.find(query)
        .populate('visitorId', 'name phoneNumber email')
        .populate('residentId', 'name email phoneNumber')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const total = await PreApproval.countDocuments(query);

      res.status(200).json({
        success: true,
        message: 'Pre-approvals retrieved successfully',
        data: {
          preApprovals,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get pre-approvals error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get Pre-Approval by ID
   * GET /api/pre-approvals/:buildingId/:preApprovalId
   */
  async getPreApprovalById(req, res) {
    try {
      const { buildingId, preApprovalId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const preApproval = await PreApproval.findOne({
        _id: preApprovalId,
        buildingId
      })
      .populate('visitorId', 'name phoneNumber email')
      .populate('residentId', 'name email phoneNumber')
      .populate('approvedBy', 'name email')
      .populate('revokedBy', 'name email');

      if (!preApproval) {
        return res.status(404).json({
          success: false,
          message: 'Pre-approval not found'
        });
      }

      // Check access permissions
      if (userRole === 'RESIDENT' && preApproval.residentId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own pre-approvals.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Pre-approval retrieved successfully',
        data: {
          preApproval
        }
      });

    } catch (error) {
      console.error('Get pre-approval by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update Pre-Approval
   * PUT /api/pre-approvals/:buildingId/:preApprovalId
   */
  async updatePreApproval(req, res) {
    try {
      const { buildingId, preApprovalId } = req.params;
      const { purpose, validUntil, maxUsage, notes, isEmergencyContact, autoApprove, notifyOnArrival, securityNotes } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const preApproval = await PreApproval.findOne({
        _id: preApprovalId,
        buildingId
      });

      if (!preApproval) {
        return res.status(404).json({
          success: false,
          message: 'Pre-approval not found'
        });
      }

      // Check access permissions
      if (userRole === 'RESIDENT' && preApproval.residentId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own pre-approvals.'
        });
      }

      // Check if pre-approval can be updated
      if (preApproval.status === 'USED' || preApproval.status === 'REVOKED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update used or revoked pre-approval'
        });
      }

      // Update fields
      if (purpose) preApproval.purpose = purpose;
      if (validUntil) preApproval.validUntil = new Date(validUntil);
      if (maxUsage !== undefined) preApproval.maxUsage = maxUsage;
      if (notes !== undefined) preApproval.notes = notes;
      if (isEmergencyContact !== undefined) preApproval.isEmergencyContact = isEmergencyContact;
      if (autoApprove !== undefined) preApproval.autoApprove = autoApprove;
      if (notifyOnArrival !== undefined) preApproval.notifyOnArrival = notifyOnArrival;
      if (securityNotes !== undefined) preApproval.securityNotes = securityNotes;

      await preApproval.save();

      // Populate references
      await preApproval.populate([
        { path: 'visitorId', select: 'name phoneNumber email' },
        { path: 'residentId', select: 'name email phoneNumber' },
        { path: 'approvedBy', select: 'name email' }
      ]);

      res.status(200).json({
        success: true,
        message: 'Pre-approval updated successfully',
        data: {
          preApproval
        }
      });

    } catch (error) {
      console.error('Update pre-approval error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Revoke Pre-Approval
   * DELETE /api/pre-approvals/:buildingId/:preApprovalId
   */
  async revokePreApproval(req, res) {
    try {
      const { buildingId, preApprovalId } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const preApproval = await PreApproval.findOne({
        _id: preApprovalId,
        buildingId
      });

      if (!preApproval) {
        return res.status(404).json({
          success: false,
          message: 'Pre-approval not found'
        });
      }

      // Check access permissions
      if (userRole === 'RESIDENT' && preApproval.residentId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only revoke your own pre-approvals.'
        });
      }

      // Check if pre-approval can be revoked
      if (preApproval.status === 'REVOKED') {
        return res.status(400).json({
          success: false,
          message: 'Pre-approval is already revoked'
        });
      }

      // Revoke pre-approval
      await preApproval.revoke(userId, reason);

      res.status(200).json({
        success: true,
        message: 'Pre-approval revoked successfully',
        data: {
          preApproval
        }
      });

    } catch (error) {
      console.error('Revoke pre-approval error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Use Pre-Approval (Increment Usage)
   * POST /api/pre-approvals/:buildingId/:preApprovalId/use
   */
  async usePreApproval(req, res) {
    try {
      const { buildingId, preApprovalId } = req.params;

      const preApproval = await PreApproval.findOne({
        _id: preApprovalId,
        buildingId
      });

      if (!preApproval) {
        return res.status(404).json({
          success: false,
          message: 'Pre-approval not found'
        });
      }

      // Check if pre-approval is valid
      if (!preApproval.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Pre-approval is not valid or has expired'
        });
      }

      // Increment usage
      await preApproval.incrementUsage();

      res.status(200).json({
        success: true,
        message: 'Pre-approval used successfully',
        data: {
          preApproval
        }
      });

    } catch (error) {
      console.error('Use pre-approval error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get Pre-Approval Statistics
   * GET /api/pre-approvals/:buildingId/stats
   */
  async getPreApprovalStats(req, res) {
    try {
      const { buildingId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Build query
      let query = { buildingId };

      // For residents, only show their pre-approvals
      if (userRole === 'RESIDENT') {
        query.residentId = userId;
      }

      // Get statistics
      const stats = await PreApproval.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
            expired: { $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] } },
            revoked: { $sum: { $cond: [{ $eq: ['$status', 'REVOKED'] }, 1, 0] } },
            used: { $sum: { $cond: [{ $eq: ['$status', 'USED'] }, 1, 0] } },
            totalUsage: { $sum: '$usageCount' },
            emergencyContacts: { $sum: { $cond: ['$isEmergencyContact', 1, 0] } }
          }
        }
      ]);

      // Get recent pre-approvals
      const recentPreApprovals = await PreApproval.find(query)
        .populate('visitorId', 'name phoneNumber')
        .sort({ createdAt: -1 })
        .limit(5);

      res.status(200).json({
        success: true,
        message: 'Pre-approval statistics retrieved successfully',
        data: {
          stats: stats[0] || {
            total: 0,
            active: 0,
            expired: 0,
            revoked: 0,
            used: 0,
            totalUsage: 0,
            emergencyContacts: 0
          },
          recentPreApprovals
        }
      });

    } catch (error) {
      console.error('Get pre-approval stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Search Pre-Approvals
   * GET /api/pre-approvals/:buildingId/search
   */
  async searchPreApprovals(req, res) {
    try {
      const { buildingId } = req.params;
      const { q, status, page = 1, limit = 10 } = req.query;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Build query
      let query = { buildingId };

      // For residents, only show their pre-approvals
      if (userRole === 'RESIDENT') {
        query.residentId = userId;
      }

      // Filter by status
      if (status) {
        query.status = status;
      }

      // Search functionality
      if (q) {
        query.$or = [
          { purpose: { $regex: q, $options: 'i' } },
          { notes: { $regex: q, $options: 'i' } },
          { securityNotes: { $regex: q, $options: 'i' } }
        ];
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get pre-approvals with pagination
      const preApprovals = await PreApproval.find(query)
        .populate('visitorId', 'name phoneNumber email')
        .populate('residentId', 'name email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const total = await PreApproval.countDocuments(query);

      res.status(200).json({
        success: true,
        message: 'Pre-approvals search completed',
        data: {
          preApprovals,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Search pre-approvals error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new PreApprovalController();
