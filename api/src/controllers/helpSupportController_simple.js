const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const Building = require('../models/Building');

// Create a new support ticket
const createSupportTicket = async (req, res) => {
  try {
    const { message, category = 'GENERAL' } = req.body;
    const residentId = req.user.id || req.user.userId;
    const buildingId = req.user.buildingId;

    // Validate required fields
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Support message is required'
      });
    }

    // Create support ticket
    const supportTicket = new SupportTicket({
      message: message.trim(),
      category: category.toUpperCase(),
      residentId,
      buildingId
    });

    await supportTicket.save();

    // Populate resident and building details
    await supportTicket.populate([
      { path: 'residentId', select: 'name email phone' },
      { path: 'buildingId', select: 'name address' }
    ]);

    console.log('✅ Support ticket created successfully:', supportTicket._id);

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully',
      data: supportTicket
    });

  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: error.message
    });
  }
};

// Get all support tickets for a resident
const getMySupportTickets = async (req, res) => {
  try {
    const residentId = req.user.id || req.user.userId;
    const { page = 1, limit = 10, status, category } = req.query;

    const query = { residentId };
    if (status) {
      query.status = status.toUpperCase();
    }
    if (category) {
      query.category = category.toUpperCase();
    }

    const supportTickets = await SupportTicket.find(query)
      .populate('buildingId', 'name address')
      .populate('assignedTo', 'name email')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SupportTicket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: supportTickets,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get my support tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets',
      error: error.message
    });
  }
};

// Get all support tickets for building admin/security
const getAllSupportTickets = async (req, res) => {
  try {
    const buildingId = req.user.buildingId;
    const { page = 1, limit = 10, status, priority, category } = req.query;

    const query = { buildingId };
    if (status) {
      query.status = status.toUpperCase();
    }
    if (priority) {
      query.priority = priority.toUpperCase();
    }
    if (category) {
      query.category = category.toUpperCase();
    }

    const supportTickets = await SupportTicket.find(query)
      .populate('residentId', 'name email phone')
      .populate('buildingId', 'name address')
      .populate('assignedTo', 'name email')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SupportTicket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: supportTickets,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get all support tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets',
      error: error.message
    });
  }
};

// Update support ticket status and response
const updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, response, priority } = req.body;
    const userId = req.user.id || req.user.userId;

    const supportTicket = await SupportTicket.findById(id);
    if (!supportTicket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Check if user has permission to update this ticket
    if (req.user.role === 'RESIDENT' && supportTicket.residentId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this support ticket'
      });
    }

    // Update fields
    if (status) supportTicket.status = status;
    if (response) supportTicket.response = response;
    if (priority) supportTicket.priority = priority;
    
    if (response) {
      supportTicket.respondedBy = userId;
      supportTicket.respondedAt = new Date();
    }

    await supportTicket.save();

    // Populate updated support ticket
    await supportTicket.populate([
      { path: 'residentId', select: 'name email phone' },
      { path: 'buildingId', select: 'name address' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'respondedBy', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully',
      data: supportTicket
    });

  } catch (error) {
    console.error('Update support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update support ticket',
      error: error.message
    });
  }
};

// Get emergency contacts
const getEmergencyContacts = async (req, res) => {
  try {
    const buildingId = req.user.buildingId;

    // Get building admin
    const building = await Building.findById(buildingId).populate('adminId', 'name email phone');
    
    // Get security users
    const securityUsers = await User.find({ 
      role: 'SECURITY', 
      buildingId: buildingId 
    }).select('name email phone');

    // Get residents (neighbors)
    const residents = await User.find({ 
      role: 'RESIDENT', 
      buildingId: buildingId 
    }).select('name email phone flatNumber').limit(10);

    const emergencyContacts = {
      admin: building.adminId ? {
        name: building.adminId.name,
        email: building.adminId.email,
        phone: building.adminId.phone,
        role: 'Building Admin'
      } : null,
      security: securityUsers.map(security => ({
        name: security.name,
        email: security.email,
        phone: security.phone,
        role: 'Security'
      })),
      neighbors: residents.map(resident => ({
        name: resident.name,
        email: resident.email,
        phone: resident.phone,
        flatNumber: resident.flatNumber,
        role: 'Neighbor'
      }))
    };

    res.status(200).json({
      success: true,
      data: emergencyContacts
    });

  } catch (error) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency contacts',
      error: error.message
    });
  }
};

// Get support ticket statistics
const getSupportTicketStats = async (req, res) => {
  try {
    const buildingId = req.user.buildingId;

    const stats = await SupportTicket.aggregate([
      { $match: { buildingId: buildingId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalTickets = await SupportTicket.countDocuments({ buildingId });
    const recentTickets = await SupportTicket.find({ buildingId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('residentId', 'name email');

    res.status(200).json({
      success: true,
      data: {
        total: totalTickets,
        byStatus: stats,
        recent: recentTickets
      }
    });

  } catch (error) {
    console.error('Get support ticket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support ticket statistics',
      error: error.message
    });
  }
};

module.exports = {
  createSupportTicket,
  getMySupportTickets,
  getAllSupportTickets,
  updateSupportTicket,
  getEmergencyContacts,
  getSupportTicketStats
};
