const AskSociety = require('../models/AskSociety');
const Building = require('../models/Building');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

/**
 * Create a new Ask Society message
 * Accessible by: RESIDENT, SECURITY, BUILDING_ADMIN
 */
const createMessage = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id || req.user.userId;
    const { title, message, status } = req.body;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Handle image upload
    let imageBase64 = null;
    if (req.file) {
      // Convert buffer to base64
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // Create new message
    const askSocietyMessage = new AskSociety({
      title,
      message,
      image: imageBase64,
      status: status || 'OPEN',
      buildingId,
      createdBy: userId
    });

    await askSocietyMessage.save();

    // Populate creator details
    await askSocietyMessage.populate('createdBy', 'name email role flatNumber');
    await askSocietyMessage.populate('buildingId', 'name');

    console.log('✅ Ask Society message created:', askSocietyMessage._id);

    res.status(201).json({
      success: true,
      message: 'Message posted successfully',
      data: {
        messageId: askSocietyMessage._id,
        title: askSocietyMessage.title,
        message: askSocietyMessage.message,
        image: askSocietyMessage.image,
        status: askSocietyMessage.status,
        createdBy: {
          id: askSocietyMessage.createdBy._id,
          name: askSocietyMessage.createdBy.name,
          role: askSocietyMessage.createdBy.role,
          flatNumber: askSocietyMessage.createdBy.flatNumber
        },
        building: {
          id: building._id,
          name: building.name
        },
        createdAt: askSocietyMessage.createdAt
      }
    });

  } catch (error) {
    console.error('Create Ask Society message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post message',
      error: error.message
    });
  }
};

/**
 * Get all Ask Society messages for a building
 * Accessible by: All roles (RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN)
 */
const getMessages = async (req, res) => {
  try {
    const { buildingId } = req.params;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Get all messages for the building (newest first, no pagination)
    const messages = await AskSociety.find({
      buildingId,
      isDeleted: false
    })
    .populate('createdBy', 'name email role flatNumber phoneNumber')
    .populate('buildingId', 'name')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        messages: messages.map(msg => ({
          _id: msg._id,
          title: msg.title,
          message: msg.message,
          image: msg.image,
          status: msg.status,
          createdBy: msg.createdBy ? {
            id: msg.createdBy._id,
            name: msg.createdBy.name,
            role: msg.createdBy.role,
            flatNumber: msg.createdBy.flatNumber,
            phoneNumber: msg.createdBy.phoneNumber
          } : null,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt
        })),
        totalCount: messages.length,
        building: {
          id: building._id,
          name: building.name
        }
      }
    });

  } catch (error) {
    console.error('Get Ask Society messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      error: error.message
    });
  }
};

/**
 * Get single Ask Society message
 * Accessible by: All roles
 */
const getMessageById = async (req, res) => {
  try {
    const { buildingId, messageId } = req.params;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Find message
    const message = await AskSociety.findOne({
      _id: messageId,
      buildingId,
      isDeleted: false
    })
    .populate('createdBy', 'name email role flatNumber phoneNumber')
    .populate('buildingId', 'name');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message retrieved successfully',
      data: {
        _id: message._id,
        title: message.title,
        message: message.message,
        image: message.image,
        status: message.status,
        createdBy: message.createdBy ? {
          id: message.createdBy._id,
          name: message.createdBy.name,
          role: message.createdBy.role,
          flatNumber: message.createdBy.flatNumber,
          phoneNumber: message.createdBy.phoneNumber
        } : null,
        building: {
          id: building._id,
          name: building.name
        },
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      }
    });

  } catch (error) {
    console.error('Get Ask Society message by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve message',
      error: error.message
    });
  }
};

/**
 * Update Ask Society message
 * Accessible by: RESIDENT, SECURITY, BUILDING_ADMIN
 */
const updateMessage = async (req, res) => {
  try {
    const { buildingId, messageId } = req.params;
    const userId = req.user.id || req.user.userId;
    const { title, message, status } = req.body;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Find message
    const askSocietyMessage = await AskSociety.findOne({
      _id: messageId,
      buildingId,
      isDeleted: false
    });

    if (!askSocietyMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Handle image update
    if (req.file) {
      // Convert new image to base64
      const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      askSocietyMessage.image = imageBase64;
    }

    // Update fields
    if (title !== undefined) askSocietyMessage.title = title;
    if (message !== undefined) askSocietyMessage.message = message;
    if (status !== undefined) askSocietyMessage.status = status;

    await askSocietyMessage.save();

    // Populate details
    await askSocietyMessage.populate('createdBy', 'name email role flatNumber');
    await askSocietyMessage.populate('buildingId', 'name');

    console.log('✅ Ask Society message updated:', askSocietyMessage._id, 'by', userId);

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        _id: askSocietyMessage._id,
        title: askSocietyMessage.title,
        message: askSocietyMessage.message,
        image: askSocietyMessage.image,
        status: askSocietyMessage.status,
        createdBy: askSocietyMessage.createdBy ? {
          id: askSocietyMessage.createdBy._id,
          name: askSocietyMessage.createdBy.name,
          role: askSocietyMessage.createdBy.role,
          flatNumber: askSocietyMessage.createdBy.flatNumber
        } : null,
        building: {
          id: building._id,
          name: building.name
        },
        createdAt: askSocietyMessage.createdAt,
        updatedAt: askSocietyMessage.updatedAt
      }
    });

  } catch (error) {
    console.error('Update Ask Society message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message',
      error: error.message
    });
  }
};

/**
 * Delete Ask Society message
 * Accessible by: All roles (anyone can delete)
 */
const deleteMessage = async (req, res) => {
  try {
    const { buildingId, messageId } = req.params;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Find message
    const askSocietyMessage = await AskSociety.findOne({
      _id: messageId,
      buildingId,
      isDeleted: false
    });

    if (!askSocietyMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Soft delete
    askSocietyMessage.isDeleted = true;
    askSocietyMessage.deletedAt = new Date();
    askSocietyMessage.deletedBy = userId;
    await askSocietyMessage.save();

    console.log('✅ Ask Society message deleted:', askSocietyMessage._id, 'by', userRole, userId);

    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: {
        messageId: askSocietyMessage._id,
        title: askSocietyMessage.title,
        deletedAt: askSocietyMessage.deletedAt,
        deletedBy: {
          id: userId,
          name: req.user.name,
          role: userRole
        }
      }
    });

  } catch (error) {
    console.error('Delete Ask Society message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

module.exports = {
  createMessage,
  getMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  upload
};

