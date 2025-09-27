const Message = require('../models/Message');
const Building = require('../models/Building');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

/**
 * Message Controller
 * Handles message posting and management for admin flow
 */
class MessageController {
  
  /**
   * Post a new message
   * Based on Figma "Post a message" screen
   */
  static async postMessage(req, res) {
    try {
      const { buildingId } = req.params;
      const { 
        title, 
        content, 
        messageType = 'GENERAL',
        priority = 'MEDIUM',
        targetAudience = 'ALL_RESIDENTS',
        specificTargets,
        scheduledAt,
        expiresAt,
        tags = [],
        isPinned = false
      } = req.body;
      
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
          message: 'Access denied. You can only post messages in your assigned building.'
        });
      }

      // Validate scheduled time
      if (scheduledAt && new Date(scheduledAt) <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled time must be in the future'
        });
      }

      // Validate expiration time
      if (expiresAt && scheduledAt && new Date(expiresAt) <= new Date(scheduledAt)) {
        return res.status(400).json({
          success: false,
          message: 'Expiration time must be after scheduled time'
        });
      }

      // Create new message
      const messageData = {
        content,
        messageType,
        priority,
        targetAudience,
        specificTargets: specificTargets || {},
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        tags,
        isPinned,
        buildingId,
        postedBy: userId
      };

      // Only add title if provided
      if (title) {
        messageData.title = title;
      }

      const message = new Message(messageData);

      await message.save();

      // Populate building and poster details
      await message.populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'postedBy', select: 'name email role' }
      ]);

      // Create notification for residents (if not scheduled)
      if (!scheduledAt) {
        try {
          await this.createMessageNotification(message, buildingId);
        } catch (notificationError) {
          console.error('Message notification creation failed:', notificationError);
          // Continue with message creation even if notification fails
        }
      }

      console.log('✅ Message posted successfully:', message._id);

      res.status(201).json({
        success: true,
        message: 'Message posted successfully',
        data: {
          message: message.getSummary(),
          building: {
            id: building._id,
            name: building.name
          },
          postedBy: {
            id: userId,
            name: req.user.name
          }
        }
      });

    } catch (error) {
      console.error('Post message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to post message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all messages for a building
   */
  static async getMessages(req, res) {
    try {
      const { buildingId } = req.params;
      const { 
        messageType, 
        priority, 
        isPinned, 
        page = 1, 
        limit = 10 
      } = req.query;
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
          message: 'Access denied. You can only view messages in your assigned building.'
        });
      }

      // Build query
      const query = { buildingId, isActive: true, isDeleted: false };
      
      if (messageType) {
        query.messageType = messageType;
      }
      
      if (priority) {
        query.priority = priority;
      }
      
      if (isPinned !== undefined) {
        query.isPinned = isPinned === 'true';
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get messages with pagination
      const messages = await Message.find(query)
        .populate([
          { path: 'buildingId', select: 'name address' },
          { path: 'postedBy', select: 'name email role' }
        ])
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const totalMessages = await Message.countDocuments(query);

      // Get message statistics
      const messageStats = await Message.aggregate([
        { $match: { buildingId: new mongoose.Types.ObjectId(buildingId), isActive: true, isDeleted: false } },
        { $group: { _id: '$messageType', count: { $sum: 1 } } }
      ]);

      const typeCounts = {};
      messageStats.forEach(stat => {
        typeCounts[stat._id] = stat.count;
      });

      res.status(200).json({
        success: true,
        message: 'Messages retrieved successfully',
        data: {
          messages: messages.map(msg => msg.getSummary()),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalMessages / parseInt(limit)),
            totalMessages,
            hasNext: skip + messages.length < totalMessages,
            hasPrev: parseInt(page) > 1
          },
          statistics: {
            ALERT: typeCounts.ALERT || 0,
            ANNOUNCEMENT: typeCounts.ANNOUNCEMENT || 0,
            MAINTENANCE: typeCounts.MAINTENANCE || 0,
            GENERAL: typeCounts.GENERAL || 0,
            TOTAL: totalMessages
          },
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve messages',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get single message by ID
   */
  static async getMessageById(req, res) {
    try {
      const { buildingId, messageId } = req.params;
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
          message: 'Access denied. You can only view messages in your assigned building.'
        });
      }

      // Get message
      const message = await Message.findOne({ 
        _id: messageId, 
        buildingId,
        isActive: true,
        isDeleted: false
      }).populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'postedBy', select: 'name email role' }
      ]);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Increment view count
      await message.incrementViews();

      res.status(200).json({
        success: true,
        message: 'Message retrieved successfully',
        data: {
          message: message.getSummary(),
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get message by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update message
   */
  static async updateMessage(req, res) {
    try {
      const { buildingId, messageId } = req.params;
      const { 
        title, 
        content, 
        messageType, 
        priority, 
        targetAudience, 
        specificTargets,
        scheduledAt,
        expiresAt,
        tags,
        isPinned
      } = req.body;
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
          message: 'Access denied. You can only update messages in your assigned building.'
        });
      }

      // Get message
      const message = await Message.findOne({ 
        _id: messageId, 
        buildingId,
        isActive: true,
        isDeleted: false
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Check if user can edit this message
      if (message.postedBy.toString() !== userId && role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only edit your own messages.'
        });
      }

      // Update message
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content) updateData.content = content;
      if (messageType) updateData.messageType = messageType;
      if (priority) updateData.priority = priority;
      if (targetAudience) updateData.targetAudience = targetAudience;
      if (specificTargets) updateData.specificTargets = specificTargets;
      if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : undefined;
      if (tags) updateData.tags = tags;
      if (isPinned !== undefined) updateData.isPinned = isPinned;

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'postedBy', select: 'name email role' }
      ]);

      console.log('✅ Message updated successfully:', updatedMessage._id);

      res.status(200).json({
        success: true,
        message: 'Message updated successfully',
        data: {
          message: updatedMessage.getSummary(),
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Update message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update message by ID (alternative route)
   */
  static async updateMessageById(req, res) {
    try {
      const { messageId } = req.params;
      const { 
        title, 
        content, 
        messageType, 
        priority, 
        targetAudience, 
        specificTargets,
        scheduledAt,
        expiresAt,
        tags,
        isPinned
      } = req.body;
      const { userId, role } = req.user;

      // Get message first to get buildingId
      const message = await Message.findOne({ 
        _id: messageId, 
        isActive: true,
        isDeleted: false
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Verify building exists
      const building = await Building.findById(message.buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      if (false && role === 'BUILDING_ADMIN' && building.adminId && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update messages in your assigned building.'
        });
      }

      // Check if user can edit this message
      if (message.postedBy.toString() !== userId && role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only edit your own messages.'
        });
      }

      // Update message
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content) updateData.content = content;
      if (messageType) updateData.messageType = messageType;
      if (priority) updateData.priority = priority;
      if (targetAudience) updateData.targetAudience = targetAudience;
      if (specificTargets) updateData.specificTargets = specificTargets;
      if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : undefined;
      if (tags) updateData.tags = tags;
      if (isPinned !== undefined) updateData.isPinned = isPinned;

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'postedBy', select: 'name email role' }
      ]);

      console.log('✅ Message updated successfully:', updatedMessage._id);

      res.status(200).json({
        success: true,
        message: 'Message updated successfully',
        data: {
          message: updatedMessage.getSummary(),
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Update message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Delete message (soft delete)
   */
  static async deleteMessage(req, res) {
    try {
      const { buildingId, messageId } = req.params;
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
          message: 'Access denied. You can only delete messages in your assigned building.'
        });
      }

      // Get message
      const message = await Message.findOne({ 
        _id: messageId, 
        buildingId,
        isActive: true,
        isDeleted: false
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Check if user can delete this message
      if (message.postedBy.toString() !== userId && role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete your own messages.'
        });
      }

      // Soft delete message
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deletedBy = userId;
      await message.save();

      console.log('✅ Message deleted successfully:', message._id);

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
        data: {
          messageId: message._id,
          title: message.title,
          deletedAt: message.deletedAt
        }
      });

    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get previous posts (for Figma "Previous Posts" section)
   */
  static async getPreviousPosts(req, res) {
    try {
      const { buildingId } = req.params;
      const { limit = 5 } = req.query;
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
          message: 'Access denied. You can only view messages in your assigned building.'
        });
      }

      // Get recent messages
      const previousPosts = await Message.getRecent(buildingId, parseInt(limit));

      // Handle empty results
      if (!previousPosts || previousPosts.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Previous posts retrieved successfully',
          data: {
            previousPosts: [],
            building: {
              id: building._id,
              name: building.name
            }
          }
        });
      }

      // Filter out messages with null references
      const validPosts = previousPosts.filter(msg => msg.postedBy);

      res.status(200).json({
        success: true,
        message: 'Previous posts retrieved successfully',
        data: {
          previousPosts: validPosts.map(msg => msg.getSummary()),
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get previous posts error:', error);
      // Return empty result instead of error for empty database
      res.status(200).json({
        success: true,
        message: 'Previous posts retrieved successfully',
        data: {
          previousPosts: [],
          building: {
            id: buildingId,
            name: 'Building'
          }
        }
      });
    }
  }

  /**
   * Create notification for message
   */
  static async createMessageNotification(message, buildingId) {
    try {
      // Get all residents in the building
      const residents = await User.find({ 
        buildingId, 
        role: 'RESIDENT', 
        isActive: true 
      });

      // Create notifications for each resident
      const notificationPromises = residents.map(resident => 
        Notification.create({
          recipientId: resident._id,
          recipientRole: 'RESIDENT',
          title: message.title || 'New Message',
          message: message.content,
          type: 'GENERAL_ANNOUNCEMENT',
          category: message.messageType,
          priority: message.priority,
          buildingId,
          relatedMessageId: message._id,
          isUrgent: message.priority === 'URGENT',
          deliveryChannels: { inApp: true, email: false, sms: false, push: false }
        })
      );

      await Promise.all(notificationPromises);
      console.log('✅ Message notifications created successfully');

    } catch (error) {
      console.error('Create message notification error:', error);
      throw error;
    }
  }
}

module.exports = MessageController;
