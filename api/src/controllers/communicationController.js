const Communication = require('../models/Communication');
const Building = require('../models/Building');
const User = require('../models/User');

/**
 * Communication Controller
 * Handles communication/notice management operations
 */

// Create communication
const createCommunication = async (req, res) => {
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

    // Create communication
    const communication = new Communication({
      ...req.body,
      buildingId,
      createdBy: userId
    });

    await communication.save();

    // Populate references
    await communication.populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'createdBy', select: 'name email phoneNumber' },
      { path: 'specificRecipients', select: 'name email phoneNumber' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Communication created successfully',
      data: communication
    });

  } catch (error) {
    console.error('Error creating communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create communication',
      error: error.message
    });
  }
};

// Get all communications for a building
const getCommunications = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { 
      page = 1, 
      limit = 20, 
      communicationType, 
      priority,
      search, 
      isActive = true,
      isPinned,
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
    const query = { buildingId, isActive };
    
    if (communicationType) {
      query.communicationType = communicationType;
    }

    if (priority) {
      query.priority = priority;
    }

    if (isPinned !== undefined) {
      query.isPinned = isPinned === 'true';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get communications
    const communications = await Communication.find(query)
      .populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'createdBy', select: 'name email phoneNumber' },
        { path: 'updatedBy', select: 'name email' },
        { path: 'specificRecipients', select: 'name email phoneNumber' }
      ])
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Communication.countDocuments(query);

    res.json({
      success: true,
      message: 'Communications retrieved successfully',
      data: {
        communications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCommunications: total,
          hasNext: skip + communications.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error getting communications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get communications',
      error: error.message
    });
  }
};

// Get single communication
const getCommunication = async (req, res) => {
  try {
    const { buildingId, communicationId } = req.params;
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

    // Get communication
    const communication = await Communication.findOne({
      _id: communicationId,
      buildingId,
      isDeleted: { $ne: true }
    }).populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'createdBy', select: 'name email phoneNumber' },
      { path: 'updatedBy', select: 'name email' },
      { path: 'specificRecipients', select: 'name email phoneNumber' },
      { path: 'comments.user', select: 'name email' },
      { path: 'likes.user', select: 'name' },
      { path: 'isRead.user', select: 'name' }
    ]);

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Mark as read for this user
    await communication.markAsRead(userId);

    res.json({
      success: true,
      message: 'Communication retrieved successfully',
      data: communication
    });

  } catch (error) {
    console.error('Error getting communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get communication',
      error: error.message
    });
  }
};

// Update communication
const updateCommunication = async (req, res) => {
  try {
    const { buildingId, communicationId } = req.params;
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

    // Get communication
    const communication = await Communication.findOne({
      _id: communicationId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Check if user can update this communication
    if (userRole === 'RESIDENT' && communication.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own communications'
      });
    }

    // Update communication
    Object.assign(communication, req.body);
    communication.updatedBy = userId;
    await communication.save();

    // Populate references
    await communication.populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'createdBy', select: 'name email phoneNumber' },
      { path: 'updatedBy', select: 'name email' },
      { path: 'specificRecipients', select: 'name email phoneNumber' }
    ]);

    res.json({
      success: true,
      message: 'Communication updated successfully',
      data: communication
    });

  } catch (error) {
    console.error('Error updating communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update communication',
      error: error.message
    });
  }
};

// Delete communication
const deleteCommunication = async (req, res) => {
  try {
    const { buildingId, communicationId } = req.params;
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

    // Get communication
    const communication = await Communication.findOne({
      _id: communicationId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Check if user can delete this communication
    if (userRole === 'RESIDENT' && communication.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own communications'
      });
    }

    // Soft delete
    await communication.softDelete(userId);

    res.json({
      success: true,
      message: 'Communication deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete communication',
      error: error.message
    });
  }
};

// Toggle pin status
const togglePin = async (req, res) => {
  try {
    const { buildingId, communicationId } = req.params;
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

    // Get communication
    const communication = await Communication.findOne({
      _id: communicationId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Toggle pin status
    communication.isPinned = !communication.isPinned;
    communication.updatedBy = userId;
    await communication.save();

    res.json({
      success: true,
      message: `Communication ${communication.isPinned ? 'pinned' : 'unpinned'} successfully`,
      data: { isPinned: communication.isPinned }
    });

  } catch (error) {
    console.error('Error toggling pin status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle pin status',
      error: error.message
    });
  }
};

// Add comment
const addComment = async (req, res) => {
  try {
    const { buildingId, communicationId } = req.params;
    const { content } = req.body;
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

    // Get communication
    const communication = await Communication.findOne({
      _id: communicationId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Add comment
    await communication.addComment(userId, content);

    // Populate the new comment
    await communication.populate('comments.user', 'name email');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: communication.comments[communication.comments.length - 1]
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

// Toggle like
const toggleLike = async (req, res) => {
  try {
    const { buildingId, communicationId } = req.params;
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

    // Get communication
    const communication = await Communication.findOne({
      _id: communicationId,
      buildingId,
      isDeleted: { $ne: true }
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Check if user already liked
    const hasLiked = communication.likes.some(like => like.user.toString() === userId.toString());

    if (hasLiked) {
      await communication.removeLike(userId);
      res.json({
        success: true,
        message: 'Like removed successfully',
        data: { liked: false, likeCount: communication.likes.length }
      });
    } else {
      await communication.addLike(userId);
      res.json({
        success: true,
        message: 'Like added successfully',
        data: { liked: true, likeCount: communication.likes.length }
      });
    }

  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error.message
    });
  }
};

// Get communication statistics
const getCommunicationStats = async (req, res) => {
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
    const stats = await Communication.aggregate([
      { $match: { buildingId: building._id, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalCommunications: { $sum: 1 },
          activeCommunications: { $sum: { $cond: ['$isActive', 1, 0] } },
          pinnedCommunications: { $sum: { $cond: ['$isPinned', 1, 0] } },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: { $size: '$likes' } },
          totalComments: { $sum: { $size: '$comments' } },
          byType: {
            $push: {
              type: '$communicationType',
              priority: '$priority',
              active: '$isActive',
              pinned: '$isPinned'
            }
          }
        }
      }
    ]);

    // Process type statistics
    const typeStats = {};
    const priorityStats = {};
    if (stats.length > 0) {
      stats[0].byType.forEach(entry => {
        // Type breakdown
        if (!typeStats[entry.type]) {
          typeStats[entry.type] = { total: 0, active: 0, pinned: 0 };
        }
        typeStats[entry.type].total++;
        if (entry.active) typeStats[entry.type].active++;
        if (entry.pinned) typeStats[entry.type].pinned++;

        // Priority breakdown
        if (!priorityStats[entry.priority]) {
          priorityStats[entry.priority] = { total: 0, active: 0, pinned: 0 };
        }
        priorityStats[entry.priority].total++;
        if (entry.active) priorityStats[entry.priority].active++;
        if (entry.pinned) priorityStats[entry.priority].pinned++;
      });
    }

    const result = stats.length > 0 ? {
      totalCommunications: stats[0].totalCommunications,
      activeCommunications: stats[0].activeCommunications,
      pinnedCommunications: stats[0].pinnedCommunications,
      totalViews: stats[0].totalViews,
      totalLikes: stats[0].totalLikes,
      totalComments: stats[0].totalComments,
      typeBreakdown: typeStats,
      priorityBreakdown: priorityStats
    } : {
      totalCommunications: 0,
      activeCommunications: 0,
      pinnedCommunications: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      typeBreakdown: {},
      priorityBreakdown: {}
    };

    res.json({
      success: true,
      message: 'Communication statistics retrieved successfully',
      data: result
    });

  } catch (error) {
    console.error('Error getting communication statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get communication statistics',
      error: error.message
    });
  }
};

module.exports = {
  createCommunication,
  getCommunications,
  getCommunication,
  updateCommunication,
  deleteCommunication,
  togglePin,
  addComment,
  toggleLike,
  getCommunicationStats
};

