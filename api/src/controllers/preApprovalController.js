const PreApproval = require('../models/PreApproval');
const Building = require('../models/Building');

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

    res.status(201).json({
      success: true,
      message: 'Pre-approval request created successfully',
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
          updatedAt: pa.updatedAt
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
  rejectPreApproval
};
