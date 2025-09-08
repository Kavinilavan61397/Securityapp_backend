const Househelp = require('../models/Househelp');
const Building = require('../models/Building');
const User = require('../models/User');

/**
 * Househelp Controller
 * Handles househelp management operations
 */

// Create househelp
const createHousehelp = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if user has access to this building
    if (userRole === 'RESIDENT' && !building.residents.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
    }

    // Create househelp
    const househelp = new Househelp({
      ...req.body,
      buildingId,
      ownerId: userId,
      createdBy: userId
    });

    await househelp.save();

    // Populate references
    await househelp.populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'ownerId', select: 'name email phoneNumber' },
      { path: 'createdBy', select: 'name email phoneNumber' },
      { path: 'verifiedBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Househelp created successfully',
      data: househelp
    });

  } catch (error) {
    console.error('Error creating househelp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create househelp',
      error: error.message
    });
  }
};

// Get all househelp for a building
const getHousehelp = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { 
      page = 1, 
      limit = 20, 
      househelpType, 
      isActive,
      isVerified,
      search, 
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if user has access to this building
    if (userRole === 'RESIDENT' && !building.residents.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
    }

    // Build query
    const query = { buildingId };
    
    if (househelpType) {
      query.househelpType = househelpType;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get househelp
    const househelp = await Househelp.find(query)
      .populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'ownerId', select: 'name email phoneNumber' },
        { path: 'createdBy', select: 'name email phoneNumber' },
        { path: 'updatedBy', select: 'name email' },
        { path: 'verifiedBy', select: 'name email' }
      ])
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Househelp.countDocuments(query);

    res.json({
      success: true,
      message: 'Househelp retrieved successfully',
      data: {
        househelp,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalHousehelp: total,
          hasNext: skip + househelp.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error getting househelp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get househelp',
      error: error.message
    });
  }
};

// Get single househelp
const getSingleHousehelp = async (req, res) => {
  try {
    const { buildingId, househelpId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if user has access to this building
    if (userRole === 'RESIDENT' && !building.residents.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
    }

    // Get househelp
    const househelp = await Househelp.findOne({
      _id: househelpId,
      buildingId,
      isDeleted: { $ne: true }
    }).populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'ownerId', select: 'name email phoneNumber' },
      { path: 'createdBy', select: 'name email phoneNumber' },
      { path: 'updatedBy', select: 'name email' },
      { path: 'verifiedBy', select: 'name email' },
      { path: 'backgroundCheck.verifiedBy', select: 'name email' }
    ]);

    if (!househelp) {
      return res.status(404).json({
        success: false,
        message: 'Househelp not found'
      });
    }

    res.json({
      success: true,
      message: 'Househelp retrieved successfully',
      data: househelp
    });

  } catch (error) {
    console.error('Error getting househelp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get househelp',
      error: error.message
    });
  }
};

// Update househelp
const updateHousehelp = async (req, res) => {
  try {
    const { buildingId, househelpId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if user has access to this building
    if (userRole === 'RESIDENT' && !building.residents.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
    }

    // Get househelp
    const househelp = await Househelp.findOne({
      _id: househelpId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!househelp) {
      return res.status(404).json({
        success: false,
        message: 'Househelp not found'
      });
    }

    // Check if user can update this househelp
    if (userRole === 'RESIDENT' && househelp.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own househelp'
      });
    }

    // Update househelp
    Object.assign(househelp, req.body);
    househelp.updatedBy = userId;
    await househelp.save();

    // Populate references
    await househelp.populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'ownerId', select: 'name email phoneNumber' },
      { path: 'createdBy', select: 'name email phoneNumber' },
      { path: 'updatedBy', select: 'name email' },
      { path: 'verifiedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Househelp updated successfully',
      data: househelp
    });

  } catch (error) {
    console.error('Error updating househelp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update househelp',
      error: error.message
    });
  }
};

// Delete househelp
const deleteHousehelp = async (req, res) => {
  try {
    const { buildingId, househelpId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if user has access to this building
    if (userRole === 'RESIDENT' && !building.residents.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
    }

    // Get househelp
    const househelp = await Househelp.findOne({
      _id: househelpId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!househelp) {
      return res.status(404).json({
        success: false,
        message: 'Househelp not found'
      });
    }

    // Check if user can delete this househelp
    if (userRole === 'RESIDENT' && househelp.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own househelp'
      });
    }

    // Soft delete
    await househelp.softDelete(userId);

    res.json({
      success: true,
      message: 'Househelp deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting househelp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete househelp',
      error: error.message
    });
  }
};

// Verify househelp
const verifyHousehelp = async (req, res) => {
  try {
    const { buildingId, househelpId } = req.params;
    const { verificationLevel, verificationNotes } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user has admin privileges
    if (!['SUPER_ADMIN', 'BUILDING_ADMIN'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required'
      });
    }

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Get househelp
    const househelp = await Househelp.findOne({
      _id: househelpId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!househelp) {
      return res.status(404).json({
        success: false,
        message: 'Househelp not found'
      });
    }

    // Verify househelp
    await househelp.verify(userId, verificationLevel, verificationNotes);

    // Populate references
    await househelp.populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'ownerId', select: 'name email phoneNumber' },
      { path: 'createdBy', select: 'name email phoneNumber' },
      { path: 'verifiedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: `Househelp ${verificationLevel.toLowerCase()} successfully`,
      data: househelp
    });

  } catch (error) {
    console.error('Error verifying househelp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify househelp',
      error: error.message
    });
  }
};

// Add work history
const addWorkHistory = async (req, res) => {
  try {
    const { buildingId, househelpId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if user has access to this building
    if (userRole === 'RESIDENT' && !building.residents.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
    }

    // Get househelp
    const househelp = await Househelp.findOne({
      _id: househelpId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!househelp) {
      return res.status(404).json({
        success: false,
        message: 'Househelp not found'
      });
    }

    // Check if user can update this househelp
    if (userRole === 'RESIDENT' && househelp.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own househelp'
      });
    }

    // Add work history
    await househelp.addWorkHistory(req.body);

    res.json({
      success: true,
      message: 'Work history added successfully',
      data: househelp.workHistory[househelp.workHistory.length - 1]
    });

  } catch (error) {
    console.error('Error adding work history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add work history',
      error: error.message
    });
  }
};

// End current work
const endCurrentWork = async (req, res) => {
  try {
    const { buildingId, househelpId } = req.params;
    const { endDate, notes } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if user has access to this building
    if (userRole === 'RESIDENT' && !building.residents.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
    }

    // Get househelp
    const househelp = await Househelp.findOne({
      _id: househelpId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!househelp) {
      return res.status(404).json({
        success: false,
        message: 'Househelp not found'
      });
    }

    // Check if user can update this househelp
    if (userRole === 'RESIDENT' && househelp.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own househelp'
      });
    }

    // End current work
    await househelp.endCurrentWork(endDate, notes);

    res.json({
      success: true,
      message: 'Current work ended successfully'
    });

  } catch (error) {
    console.error('Error ending current work:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end current work',
      error: error.message
    });
  }
};

// Get househelp statistics
const getHousehelpStats = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if user has access to this building
    if (userRole === 'RESIDENT' && !building.residents.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
    }

    // Get statistics
    const stats = await Househelp.aggregate([
      { $match: { buildingId: building._id, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalHousehelp: { $sum: 1 },
          activeHousehelp: { $sum: { $cond: ['$isActive', 1, 0] } },
          verifiedHousehelp: { $sum: { $cond: ['$isVerified', 1, 0] } },
          byType: {
            $push: {
              type: '$househelpType',
              active: '$isActive',
              verified: '$isVerified'
            }
          }
        }
      }
    ]);

    // Process type statistics
    const typeStats = {};
    if (stats.length > 0) {
      stats[0].byType.forEach(entry => {
        if (!typeStats[entry.type]) {
          typeStats[entry.type] = { total: 0, active: 0, verified: 0 };
        }
        typeStats[entry.type].total++;
        if (entry.active) typeStats[entry.type].active++;
        if (entry.verified) typeStats[entry.type].verified++;
      });
    }

    const result = stats.length > 0 ? {
      totalHousehelp: stats[0].totalHousehelp,
      activeHousehelp: stats[0].activeHousehelp,
      verifiedHousehelp: stats[0].verifiedHousehelp,
      typeBreakdown: typeStats
    } : {
      totalHousehelp: 0,
      activeHousehelp: 0,
      verifiedHousehelp: 0,
      typeBreakdown: {}
    };

    res.json({
      success: true,
      message: 'Househelp statistics retrieved successfully',
      data: result
    });

  } catch (error) {
    console.error('Error getting househelp statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get househelp statistics',
      error: error.message
    });
  }
};

module.exports = {
  createHousehelp,
  getHousehelp,
  getSingleHousehelp,
  updateHousehelp,
  deleteHousehelp,
  verifyHousehelp,
  addWorkHistory,
  endCurrentWork,
  getHousehelpStats
};
