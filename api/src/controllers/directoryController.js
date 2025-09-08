const Directory = require('../models/Directory');
const Building = require('../models/Building');
const User = require('../models/User');

/**
 * Directory Controller
 * Handles directory management operations
 */

// Add directory entry
const addDirectoryEntry = async (req, res) => {
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

    // Create directory entry
    const directoryEntry = new Directory({
      ...req.body,
      buildingId,
      createdBy: userId
    });

    await directoryEntry.save();

    // Populate references
    await directoryEntry.populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'createdBy', select: 'name email phoneNumber' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Directory entry added successfully',
      data: directoryEntry
    });

  } catch (error) {
    console.error('Error adding directory entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add directory entry',
      error: error.message
    });
  }
};

// Get all directory entries for a building
const getDirectoryEntries = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { 
      page = 1, 
      limit = 20, 
      directoryType, 
      search, 
      isActive = true,
      sortBy = 'name',
      sortOrder = 'asc'
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
    const query = { buildingId, isActive };
    
    if (directoryType) {
      query.directoryType = directoryType;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { flatNumber: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get directory entries
    const directoryEntries = await Directory.find(query)
      .populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'createdBy', select: 'name email' }
      ])
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Directory.countDocuments(query);

    res.json({
      success: true,
      message: 'Directory entries retrieved successfully',
      data: {
        entries: directoryEntries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalEntries: total,
          hasNext: skip + directoryEntries.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error getting directory entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get directory entries',
      error: error.message
    });
  }
};

// Get single directory entry
const getDirectoryEntry = async (req, res) => {
  try {
    const { buildingId, entryId } = req.params;
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

    // Get directory entry
    const directoryEntry = await Directory.findOne({
      _id: entryId,
      buildingId,
      isDeleted: { $ne: true }
    }).populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'createdBy', select: 'name email phoneNumber' },
      { path: 'updatedBy', select: 'name email' }
    ]);

    if (!directoryEntry) {
      return res.status(404).json({
        success: false,
        message: 'Directory entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Directory entry retrieved successfully',
      data: directoryEntry
    });

  } catch (error) {
    console.error('Error getting directory entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get directory entry',
      error: error.message
    });
  }
};

// Update directory entry
const updateDirectoryEntry = async (req, res) => {
  try {
    const { buildingId, entryId } = req.params;
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

    // Get directory entry
    const directoryEntry = await Directory.findOne({
      _id: entryId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!directoryEntry) {
      return res.status(404).json({
        success: false,
        message: 'Directory entry not found'
      });
    }

    // Check if user can update this entry
    if (userRole === 'RESIDENT' && directoryEntry.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own directory entries'
      });
    }

    // Update directory entry
    Object.assign(directoryEntry, req.body);
    directoryEntry.updatedBy = userId;
    await directoryEntry.save();

    // Populate references
    await directoryEntry.populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'createdBy', select: 'name email phoneNumber' },
      { path: 'updatedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Directory entry updated successfully',
      data: directoryEntry
    });

  } catch (error) {
    console.error('Error updating directory entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update directory entry',
      error: error.message
    });
  }
};

// Delete directory entry
const deleteDirectoryEntry = async (req, res) => {
  try {
    const { buildingId, entryId } = req.params;
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

    // Get directory entry
    const directoryEntry = await Directory.findOne({
      _id: entryId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!directoryEntry) {
      return res.status(404).json({
        success: false,
        message: 'Directory entry not found'
      });
    }

    // Check if user can delete this entry
    if (userRole === 'RESIDENT' && directoryEntry.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own directory entries'
      });
    }

    // Soft delete
    await directoryEntry.softDelete(userId);

    res.json({
      success: true,
      message: 'Directory entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting directory entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete directory entry',
      error: error.message
    });
  }
};

// Verify directory entry (Admin only)
const verifyDirectoryEntry = async (req, res) => {
  try {
    const { buildingId, entryId } = req.params;
    const { isVerified, verificationNotes } = req.body;
    const adminId = req.user.userId;

    // Get directory entry
    const directoryEntry = await Directory.findOne({
      _id: entryId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!directoryEntry) {
      return res.status(404).json({
        success: false,
        message: 'Directory entry not found'
      });
    }

    // Update verification
    directoryEntry.isVerified = isVerified;
    directoryEntry.verificationNotes = verificationNotes || '';
    directoryEntry.updatedBy = adminId;
    await directoryEntry.save();

    res.json({
      success: true,
      message: `Directory entry ${isVerified ? 'verified' : 'unverified'} successfully`,
      data: directoryEntry
    });

  } catch (error) {
    console.error('Error verifying directory entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify directory entry',
      error: error.message
    });
  }
};

// Get directory statistics
const getDirectoryStats = async (req, res) => {
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
    const stats = await Directory.aggregate([
      { $match: { buildingId: building._id, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          verifiedEntries: { $sum: { $cond: ['$isVerified', 1, 0] } },
          activeEntries: { $sum: { $cond: ['$isActive', 1, 0] } },
          byType: {
            $push: {
              type: '$directoryType',
              verified: '$isVerified',
              active: '$isActive'
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
          typeStats[entry.type] = { total: 0, verified: 0, active: 0 };
        }
        typeStats[entry.type].total++;
        if (entry.verified) typeStats[entry.type].verified++;
        if (entry.active) typeStats[entry.type].active++;
      });
    }

    const result = stats.length > 0 ? {
      totalEntries: stats[0].totalEntries,
      verifiedEntries: stats[0].verifiedEntries,
      activeEntries: stats[0].activeEntries,
      verificationRate: stats[0].totalEntries > 0 ? 
        (stats[0].verifiedEntries / stats[0].totalEntries * 100).toFixed(2) : 0,
      typeBreakdown: typeStats
    } : {
      totalEntries: 0,
      verifiedEntries: 0,
      activeEntries: 0,
      verificationRate: 0,
      typeBreakdown: {}
    };

    res.json({
      success: true,
      message: 'Directory statistics retrieved successfully',
      data: result
    });

  } catch (error) {
    console.error('Error getting directory statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get directory statistics',
      error: error.message
    });
  }
};

module.exports = {
  addDirectoryEntry,
  getDirectoryEntries,
  getDirectoryEntry,
  updateDirectoryEntry,
  deleteDirectoryEntry,
  verifyDirectoryEntry,
  getDirectoryStats
};
