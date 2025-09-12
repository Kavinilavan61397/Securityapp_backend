const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Building = require('../models/Building');

// Create a new complaint
const createComplaint = async (req, res) => {
  try {
    const { message } = req.body;
    const residentId = req.user.id || req.user.userId;
    const buildingId = req.user.buildingId;

    // Validate required fields
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Complaint message is required'
      });
    }

    // Validate user authentication
    if (!residentId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    if (!buildingId) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with a building'
      });
    }

    // Create complaint
    const complaint = new Complaint({
      message: message.trim(),
      residentId,
      buildingId
    });

    await complaint.save();

    // Populate resident and building details
    await complaint.populate([
      { path: 'residentId', select: 'name email phone' },
      { path: 'buildingId', select: 'name address' }
    ]);

    console.log('✅ Complaint created successfully:', complaint._id);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: complaint
    });

  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create complaint',
      error: error.message
    });
  }
};

// Get all complaints for a resident
const getMyComplaints = async (req, res) => {
  try {
    const residentId = req.user.id || req.user.userId;
    const { page = 1, limit = 10, status } = req.query;

    const query = { residentId };
    if (status) {
      query.status = status.toUpperCase();
    }

    const complaints = await Complaint.find(query)
      .populate('buildingId', 'name address')
      .populate('assignedTo', 'name email')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(query);

    res.status(200).json({
      success: true,
      data: complaints,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get my complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints',
      error: error.message
    });
  }
};

// Get all complaints for building admin/security
const getAllComplaints = async (req, res) => {
  try {
    const buildingId = req.user.buildingId;
    const { page = 1, limit = 10, status, priority } = req.query;

    const query = { buildingId };
    if (status) {
      query.status = status.toUpperCase();
    }
    if (priority) {
      query.priority = priority.toUpperCase();
    }

    const complaints = await Complaint.find(query)
      .populate('residentId', 'name email phone')
      .populate('buildingId', 'name address')
      .populate('assignedTo', 'name email')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(query);

    res.status(200).json({
      success: true,
      data: complaints,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints',
      error: error.message
    });
  }
};

// Update complaint status and response
const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, response, priority } = req.body;
    const userId = req.user.id || req.user.userId;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check if user has permission to update this complaint
    if (req.user.role === 'RESIDENT' && complaint.residentId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this complaint'
      });
    }

    // Update fields
    if (status) complaint.status = status;
    if (response) complaint.response = response;
    if (priority) complaint.priority = priority;
    
    if (response) {
      complaint.respondedBy = userId;
      complaint.respondedAt = new Date();
    }

    await complaint.save();

    // Populate updated complaint
    await complaint.populate([
      { path: 'residentId', select: 'name email phone' },
      { path: 'buildingId', select: 'name address' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'respondedBy', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      data: complaint
    });

  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update complaint',
      error: error.message
    });
  }
};

// Get complaint statistics
const getComplaintStats = async (req, res) => {
  try {
    const buildingId = req.user.buildingId;

    const stats = await Complaint.aggregate([
      { $match: { buildingId: buildingId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalComplaints = await Complaint.countDocuments({ buildingId });
    const recentComplaints = await Complaint.find({ buildingId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('residentId', 'name email');

    res.status(200).json({
      success: true,
      data: {
        total: totalComplaints,
        byStatus: stats,
        recent: recentComplaints
      }
    });

  } catch (error) {
    console.error('Get complaint stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaint statistics',
      error: error.message
    });
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaint,
  getComplaintStats
};
