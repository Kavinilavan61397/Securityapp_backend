const PreApproval = require('../models/PreApproval');
const Building = require('../models/Building');
const Visitor = require('../models/Visitor');
const Visit = require('../models/Visit');
const User = require('../models/User');

// Helper function to create visitor from pre-approval data
const createVisitorFromPreApproval = async (preApproval) => {
  try {
    // Check if visitor already exists by phone number
    let visitor = await Visitor.findOne({ 
      phoneNumber: preApproval.visitorPhone,
      buildingId: preApproval.buildingId
    });

    if (!visitor) {
      // Create new visitor
      visitor = new Visitor({
        name: preApproval.visitorName,
        phoneNumber: preApproval.visitorPhone,
        email: preApproval.visitorEmail || undefined,
        buildingId: preApproval.buildingId,
        visitorCategory: 'OTHER',
        serviceType: 'PERSONAL',
        flatNumber: preApproval.flatNumber || undefined,
        isActive: true
      });

      await visitor.save();
      console.log('✅ Visitor created from pre-approval:', visitor._id);
    } else {
      console.log('✅ Using existing visitor:', visitor._id);
    }

    return visitor;
  } catch (error) {
    console.error('Error creating visitor from pre-approval:', error);
    throw error;
  }
};

// Helper function to create visit from pre-approval data
const createVisitFromPreApproval = async (preApproval, visitor) => {
  try {
    // Generate unique visit ID
    const visitId = `VISIT_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create visit
    const visit = new Visit({
      visitId,
      visitorId: visitor._id,
      buildingId: preApproval.buildingId,
      hostId: preApproval.residentId,
      hostFlatNumber: preApproval.flatNumber || undefined,
      purpose: preApproval.purpose || 'Visit from pre-approval',
      visitType: 'PRE_APPROVED',
      scheduledDate: preApproval.expectedDate || new Date(),
      scheduledTime: preApproval.expectedTime || '10:00 AM',
      expectedDuration: 120, // Default 2 hours
      preApprovalId: preApproval._id,
      status: 'SCHEDULED',
      approvalStatus: 'PENDING'
    });

    await visit.save();
    console.log('✅ Visit created from pre-approval:', visit._id);
    console.log('✅ QR Code generated:', visit.qrCode);

    return visit;
  } catch (error) {
    console.error('Error creating visit from pre-approval:', error);
    throw error;
  }
};

// Create a new pre-approval
const createPreApproval = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id || req.user.userId;
    const { visitorName, visitorPhone, visitorEmail, purpose, expectedDate, expectedTime, notes, residentMobileNumber, flatNumber } = req.body;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Create new pre-approval
    const preApproval = new PreApproval({
      visitorName,
      visitorPhone,
      visitorEmail,
      purpose,
      expectedDate,
      expectedTime,
      notes,
      residentMobileNumber,
      flatNumber,
      residentId: userId,
      buildingId
    });

    await preApproval.save();

    // Automatically create visitor and visit
    try {
      console.log('🔄 Creating visitor and visit from pre-approval...');
      
      // Create visitor from pre-approval data
      const visitor = await createVisitorFromPreApproval(preApproval);
      
      // Create visit from pre-approval data
      const visit = await createVisitFromPreApproval(preApproval, visitor);
      
      console.log('✅ Pre-approval flow completed successfully');
      
      res.status(201).json({
        success: true,
        message: 'Pre-approval request created successfully and visit generated',
        data: {
          preApprovalId: preApproval._id,
          visitorName: preApproval.visitorName,
          visitorPhone: preApproval.visitorPhone,
          visitorEmail: preApproval.visitorEmail,
          purpose: preApproval.purpose,
          expectedDate: preApproval.expectedDate,
          expectedTime: preApproval.expectedTime,
          residentMobileNumber: preApproval.residentMobileNumber,
          flatNumber: preApproval.flatNumber,
          status: preApproval.status,
          fullIdentification: preApproval.fullIdentification,
          visit: {
            id: visit._id,
            visitId: visit.visitId,
            status: visit.status,
            qrCode: visit.qrCode,
            qrCodeExpiresAt: visit.qrCodeExpiresAt
          },
          visitor: {
            id: visitor._id,
            name: visitor.name,
            phoneNumber: visitor.phoneNumber
          },
          resident: {
            id: userId,
            name: req.user.name || 'Resident'
          },
          building: {
            id: buildingId,
            name: building.name
          }
        }
      });
      
    } catch (visitError) {
      console.error('❌ Error creating visit from pre-approval:', visitError);
      
      // Still return success for pre-approval creation, but note the visit creation error
      res.status(201).json({
        success: true,
        message: 'Pre-approval request created successfully, but visit creation failed',
        data: {
          preApprovalId: preApproval._id,
          visitorName: preApproval.visitorName,
          visitorPhone: preApproval.visitorPhone,
          visitorEmail: preApproval.visitorEmail,
          purpose: preApproval.purpose,
          expectedDate: preApproval.expectedDate,
          expectedTime: preApproval.expectedTime,
          residentMobileNumber: preApproval.residentMobileNumber,
          flatNumber: preApproval.flatNumber,
          status: preApproval.status,
          fullIdentification: preApproval.fullIdentification,
          warning: 'Visit creation failed - please create visit manually',
          resident: {
            id: userId,
            name: req.user.name || 'Resident'
          },
          building: {
            id: buildingId,
            name: building.name
          }
        }
      });
    }

  } catch (error) {
    console.error('Create pre-approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pre-approval request',
      error: error.message
    });
  }
};

// Get all pre-approvals for a resident
const getPreApprovals = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;
    const { page = 1, limit = 10, status } = req.query;

    // Build query based on user role
    let query = {
      buildingId,
      isDeleted: false
    };

    // Only residents can see their own pre-approvals
    // Security and Admin can see all pre-approvals in their building
    if (userRole === 'RESIDENT') {
      query.residentId = userId;
    }

    if (status) {
      query.status = status;
    }

    const preApprovals = await PreApproval.find(query)
      .populate('residentId', 'name email phoneNumber flatNumber blockNumber societyName area city tenantType')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PreApproval.countDocuments(query);

    res.json({
      success: true,
      message: 'Pre-approvals retrieved successfully',
      data: {
        preApprovals: preApprovals.map(pa => ({
          _id: pa._id,
          visitorName: pa.visitorName,
          visitorPhone: pa.visitorPhone,
          visitorEmail: pa.visitorEmail,
          purpose: pa.purpose,
          expectedDate: pa.expectedDate,
          expectedTime: pa.expectedTime,
          residentMobileNumber: pa.residentMobileNumber,
          flatNumber: pa.flatNumber,
          status: pa.status,
          fullIdentification: pa.fullIdentification,
          createdAt: pa.createdAt,
          updatedAt: pa.updatedAt,
          resident: {
            id: pa.residentId?._id,
            name: pa.residentId?.name,
            email: pa.residentId?.email,
            phoneNumber: pa.residentId?.phoneNumber,
            address: {
              flatNumber: pa.residentId?.flatNumber,
              blockNumber: pa.residentId?.blockNumber,
              societyName: pa.residentId?.societyName,
              area: pa.residentId?.area,
              city: pa.residentId?.city,
              tenantType: pa.residentId?.tenantType
            }
          }
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalPreApprovals: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get pre-approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pre-approvals',
      error: error.message
    });
  }
};

// Get single pre-approval
const getPreApproval = async (req, res) => {
  try {
    const { buildingId, preApprovalId } = req.params;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    // Build query based on user role
    let query = {
      _id: preApprovalId,
      buildingId,
      isDeleted: false
    };

    // Only residents can see their own pre-approvals
    // Security and Admin can see any pre-approval in their building
    if (userRole === 'RESIDENT') {
      query.residentId = userId;
    }

    const preApproval = await PreApproval.findOne(query);

    if (!preApproval) {
      return res.status(404).json({
        success: false,
        message: 'Pre-approval not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Pre-approval retrieved successfully',
      data: {
        _id: preApproval._id,
        visitorName: preApproval.visitorName,
        visitorPhone: preApproval.visitorPhone,
        visitorEmail: preApproval.visitorEmail,
        purpose: preApproval.purpose,
        expectedDate: preApproval.expectedDate,
        expectedTime: preApproval.expectedTime,
        residentMobileNumber: preApproval.residentMobileNumber,
        flatNumber: preApproval.flatNumber,
        notes: preApproval.notes,
        status: preApproval.status,
        fullIdentification: preApproval.fullIdentification,
        createdAt: preApproval.createdAt,
        updatedAt: preApproval.updatedAt
      }
    });

  } catch (error) {
    console.error('Get pre-approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pre-approval',
      error: error.message
    });
  }
};

// Update pre-approval
const updatePreApproval = async (req, res) => {
  try {
    const { buildingId, preApprovalId } = req.params;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;
    const { visitorName, visitorPhone, visitorEmail, purpose, expectedDate, expectedTime, notes, residentMobileNumber, flatNumber } = req.body;

    // Build query based on user role
    let query = {
      _id: preApprovalId,
      buildingId,
      isDeleted: false
    };

    // Only residents can update their own pre-approvals
    // Security and Admin can update any pre-approval in their building
    if (userRole === 'RESIDENT') {
      query.residentId = userId;
    }

    const preApproval = await PreApproval.findOne(query);

    if (!preApproval) {
      return res.status(404).json({
        success: false,
        message: 'Pre-approval not found or access denied'
      });
    }

    // Only allow updates if status is PENDING
    if (preApproval.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update pre-approval that has been processed'
      });
    }

    // Update fields
    if (visitorName) preApproval.visitorName = visitorName;
    if (visitorPhone) preApproval.visitorPhone = visitorPhone;
    if (visitorEmail !== undefined) preApproval.visitorEmail = visitorEmail;
    if (purpose !== undefined) preApproval.purpose = purpose;
    if (expectedDate !== undefined) preApproval.expectedDate = expectedDate;
    if (expectedTime !== undefined) preApproval.expectedTime = expectedTime;
    if (notes !== undefined) preApproval.notes = notes;
    if (residentMobileNumber !== undefined) preApproval.residentMobileNumber = residentMobileNumber;
    if (flatNumber !== undefined) preApproval.flatNumber = flatNumber;

    await preApproval.save();

    res.json({
      success: true,
      message: 'Pre-approval updated successfully',
      data: {
        preApprovalId: preApproval._id,
        visitorName: preApproval.visitorName,
        visitorPhone: preApproval.visitorPhone,
        visitorEmail: preApproval.visitorEmail,
        purpose: preApproval.purpose,
        expectedDate: preApproval.expectedDate,
        expectedTime: preApproval.expectedTime,
        residentMobileNumber: preApproval.residentMobileNumber,
        flatNumber: preApproval.flatNumber,
        status: preApproval.status,
        fullIdentification: preApproval.fullIdentification
      }
    });

  } catch (error) {
    console.error('Update pre-approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pre-approval',
      error: error.message
    });
  }
};

// Delete pre-approval
const deletePreApproval = async (req, res) => {
  try {
    const { buildingId, preApprovalId } = req.params;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    // Build query based on user role
    let query = {
      _id: preApprovalId,
      buildingId,
      isDeleted: false
    };

    // Only residents can delete their own pre-approvals
    // Security and Admin can delete any pre-approval in their building
    if (userRole === 'RESIDENT') {
      query.residentId = userId;
    }

    const preApproval = await PreApproval.findOne(query);

    if (!preApproval) {
      return res.status(404).json({
        success: false,
        message: 'Pre-approval not found or access denied'
      });
    }

    // Soft delete
    preApproval.isDeleted = true;
    preApproval.deletedAt = new Date();
    preApproval.deletedBy = userId;
    await preApproval.save();

    res.json({
      success: true,
      message: 'Pre-approval deleted successfully',
      data: {
        preApprovalId: preApproval._id,
        visitorName: preApproval.visitorName,
        deletedAt: preApproval.deletedAt
      }
    });

  } catch (error) {
    console.error('Delete pre-approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pre-approval',
      error: error.message
    });
  }
};

// Approve pre-approval (Admin/Security)
const approvePreApproval = async (req, res) => {
  try {
    const { buildingId, preApprovalId } = req.params;
    const { adminNotes } = req.body;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    // Find the pre-approval
    const preApproval = await PreApproval.findOne({
      _id: preApprovalId,
      buildingId,
      isDeleted: false
    }).populate('residentId', 'name email phoneNumber');

    if (!preApproval) {
      return res.status(404).json({
        success: false,
        message: 'Pre-approval not found'
      });
    }

    // Check if already processed
    if (preApproval.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Pre-approval is already ${preApproval.status.toLowerCase()}`
      });
    }

    // Update status to approved
    preApproval.status = 'APPROVED';
    preApproval.approvedBy = userId;
    preApproval.approvedAt = new Date();
    if (adminNotes) {
      preApproval.notes = adminNotes;
    }

    await preApproval.save();

    // Update associated visit status to APPROVED
    try {
      const visit = await Visit.findOne({ preApprovalId: preApproval._id });
      if (visit) {
        visit.status = 'APPROVED';
        visit.approvalStatus = 'APPROVED';
        visit.approvedBy = userId;
        visit.approvedAt = new Date();
        await visit.save();
        console.log('✅ Visit status updated to APPROVED:', visit._id);
        
        // Update visitor approval status to APPROVED
        await Visitor.findByIdAndUpdate(
          visit.visitorId,
          { approvalStatus: 'APPROVED' },
          { new: true }
        );
        console.log('✅ Visitor approval status updated to APPROVED:', visit.visitorId);
      }
    } catch (visitError) {
      console.error('❌ Error updating visit status:', visitError);
      // Don't fail the pre-approval approval if visit update fails
    }

    res.json({
      success: true,
      message: 'Pre-approval approved successfully',
      data: {
        preApprovalId: preApproval._id,
        visitorName: preApproval.visitorName,
        visitorPhone: preApproval.visitorPhone,
        flatNumber: preApproval.flatNumber,
        status: preApproval.status,
        approvedAt: preApproval.approvedAt,
        approvedBy: {
          role: userRole,
          userId: userId
        }
      }
    });

  } catch (error) {
    console.error('Approve pre-approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve pre-approval',
      error: error.message
    });
  }
};

// Reject pre-approval (Admin/Security)
const rejectPreApproval = async (req, res) => {
  try {
    const { buildingId, preApprovalId } = req.params;
    const { rejectionReason, adminNotes } = req.body;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    // Find the pre-approval
    const preApproval = await PreApproval.findOne({
      _id: preApprovalId,
      buildingId,
      isDeleted: false
    }).populate('residentId', 'name email phoneNumber');

    if (!preApproval) {
      return res.status(404).json({
        success: false,
        message: 'Pre-approval not found'
      });
    }

    // Check if already processed
    if (preApproval.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Pre-approval is already ${preApproval.status.toLowerCase()}`
      });
    }

    // Update status to rejected
    preApproval.status = 'REJECTED';
    preApproval.approvedBy = userId;
    preApproval.approvedAt = new Date();
    preApproval.rejectionReason = rejectionReason || 'No reason provided';
    if (adminNotes) {
      preApproval.notes = adminNotes;
    }

    await preApproval.save();

    // Update associated visit status to REJECTED
    try {
      const visit = await Visit.findOne({ preApprovalId: preApproval._id });
      if (visit) {
        visit.status = 'REJECTED';
        visit.approvalStatus = 'REJECTED';
        visit.rejectedBy = userId;
        visit.rejectedAt = new Date();
        visit.rejectionReason = rejectionReason || 'No reason provided';
        await visit.save();
        console.log('✅ Visit status updated to REJECTED:', visit._id);
        
        // Update visitor approval status to DENIED
        await Visitor.findByIdAndUpdate(
          visit.visitorId,
          { approvalStatus: 'DENIED' },
          { new: true }
        );
        console.log('✅ Visitor approval status updated to DENIED:', visit.visitorId);
      }
    } catch (visitError) {
      console.error('❌ Error updating visit status:', visitError);
      // Don't fail the pre-approval rejection if visit update fails
    }

    res.json({
      success: true,
      message: 'Pre-approval rejected successfully',
      data: {
        preApprovalId: preApproval._id,
        visitorName: preApproval.visitorName,
        visitorPhone: preApproval.visitorPhone,
        flatNumber: preApproval.flatNumber,
        status: preApproval.status,
        rejectionReason: preApproval.rejectionReason,
        rejectedAt: preApproval.approvedAt,
        rejectedBy: {
          role: userRole,
          userId: userId
        }
      }
    });

  } catch (error) {
    console.error('Reject pre-approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject pre-approval',
      error: error.message
    });
  }
};

module.exports = {
  createPreApproval,
  getPreApprovals,
  getPreApproval,
  updatePreApproval,
  deletePreApproval,
  approvePreApproval,
  rejectPreApproval,
  createVisitorFromPreApproval,
  createVisitFromPreApproval
};
