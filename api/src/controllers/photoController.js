const Photo = require('../models/Photo');
const Building = require('../models/Building');
const User = require('../models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Photo Controller
 * Handles photo upload, storage, retrieval, and management using local file storage
 */

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const buildingDir = path.join(uploadsDir, req.params.buildingId);
    if (!fs.existsSync(buildingDir)) {
      fs.mkdirSync(buildingDir, { recursive: true });
    }
    cb(null, buildingDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex') + '_' + Date.now();
    const filename = uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  }
});

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload photo
const uploadPhoto = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { 
      relatedType, 
      relatedId, 
      description, 
      tags = [],
      isPublic = false 
    } = req.body;

    // Validate building access
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Ensure uploadedBy is set (use userId from auth middleware)
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Create photo record
    const photo = await Photo.create({
      photoId: `PHOTO_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.userId, // Fixed: use userId instead of id
      buildingId,
      relatedType,
      relatedId,
      description,
      tags,
      isPublic,
      metadata: {
        uploadedAt: new Date(),
        uploadedBy: req.user.userId, // Fixed: use userId instead of id
        buildingId,
        originalName: req.file.originalname
      }
    });

    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: photo
    });

  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo',
      error: error.message
    });
  }
};

// Get photo by ID
const getPhoto = async (req, res) => {
  try {
    const { buildingId, photoId } = req.params;

    const photo = await Photo.findOne({
      _id: photoId,
      buildingId
    }).populate('uploadedBy', 'name role');

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Check access permissions
    if (!photo.isPublic && photo.uploadedBy._id.toString() !== req.user.id) {
      // Check if user has admin access
      if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BUILDING_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this photo'
        });
      }
    }

    res.json({
      success: true,
      data: photo
    });

  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get photo',
      error: error.message
    });
  }
};

// Stream photo file
const streamPhoto = async (req, res) => {
  try {
    const { buildingId, photoId } = req.params;

    const photo = await Photo.findOne({
      _id: photoId,
      buildingId
    });

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Check access permissions
    if (!photo.isPublic && photo.uploadedBy.toString() !== req.user.id) {
      // Check if user has admin access
      if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BUILDING_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this photo'
        });
      }
    }

    // Set appropriate headers
    res.set('Content-Type', photo.mimeType);
    res.set('Content-Disposition', `inline; filename="${photo.originalName}"`);

    // Stream the file from local storage
    const filePath = path.join(uploadsDir, buildingId, photo.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Photo file not found on disk'
      });
    }

    const readstream = fs.createReadStream(filePath);
    readstream.pipe(res);

    readstream.on('error', (error) => {
      console.error('Stream photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream photo',
        error: error.message
      });
    });

  } catch (error) {
    console.error('Stream photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream photo',
      error: error.message
    });
  }
};

// Get photos for a building
const getPhotos = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      relatedType, 
      relatedId,
      tags,
      isPublic,
      uploadedBy
    } = req.query;

    // Build query
    const query = { buildingId };

    if (relatedType) {
      query.relatedType = relatedType;
    }

    if (relatedId) {
      query.relatedId = relatedId;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    if (uploadedBy) {
      query.uploadedBy = uploadedBy;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get photos
    const photos = await Photo.find(query)
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Photo.countDocuments(query);

    res.json({
      success: true,
      data: {
        photos,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPhotos: total,
          hasNextPage: skip + photos.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get photos',
      error: error.message
    });
  }
};

// Update photo metadata
const updatePhoto = async (req, res) => {
  try {
    const { buildingId, photoId } = req.params;
    const { description, tags, isPublic } = req.body;

    const photo = await Photo.findOne({
      _id: photoId,
      buildingId
    });

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Check permissions
    if (photo.uploadedBy.toString() !== req.user.id) {
      if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BUILDING_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to update this photo'
        });
      }
    }

    // Update photo
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [tags];
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const updatedPhoto = await Photo.findByIdAndUpdate(
      photoId,
      updateData,
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'name role');

    res.json({
      success: true,
      message: 'Photo updated successfully',
      data: updatedPhoto
    });

  } catch (error) {
    console.error('Update photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update photo',
      error: error.message
    });
  }
};

// Delete photo
const deletePhoto = async (req, res) => {
  try {
    const { buildingId, photoId } = req.params;

    const photo = await Photo.findOne({
      _id: photoId,
      buildingId
    });

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Check permissions
    if (photo.uploadedBy.toString() !== req.user.id) {
      if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BUILDING_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to delete this photo'
        });
      }
    }

    // Delete from local storage
    const filePath = path.join(uploadsDir, buildingId, photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete photo record
    await Photo.findByIdAndDelete(photoId);

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete photo',
      error: error.message
    });
  }
};

// Get photo statistics
const getPhotoStats = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;

    // Build match stage
    const matchStage = { buildingId: new mongoose.Types.ObjectId(buildingId) };
    
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get statistics
    const stats = await Photo.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalPhotos: { $sum: 1 },
          totalSize: { $sum: '$size' },
          publicPhotos: { $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] } },
          privatePhotos: { $sum: { $cond: [{ $eq: ['$isPublic', false] }, 1, 0] } },
          byType: {
            $push: {
              relatedType: '$relatedType',
              size: '$size',
              isPublic: '$isPublic'
            }
          }
        }
      }
    ]);

    // Process type-based statistics
    const typeStats = {};
    if (stats.length > 0 && stats[0].byType) {
      stats[0].byType.forEach(item => {
        if (!typeStats[item.relatedType]) {
          typeStats[item.relatedType] = { count: 0, size: 0, public: 0, private: 0 };
        }
        typeStats[item.relatedType].count++;
        typeStats[item.relatedType].size += item.size;
        if (item.isPublic) {
          typeStats[item.relatedType].public++;
        } else {
          typeStats[item.relatedType].private++;
        }
      });
    }

    res.json({
      success: true,
      data: {
        stats: stats[0] || {
          totalPhotos: 0,
          totalSize: 0,
          publicPhotos: 0,
          privatePhotos: 0
        },
        typeStats
      }
    });

  } catch (error) {
    console.error('Get photo stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get photo statistics',
      error: error.message
    });
  }
};

// Search photos
const searchPhotos = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { 
      q, 
      page = 1, 
      limit = 20, 
      relatedType,
      tags,
      isPublic,
      startDate,
      endDate
    } = req.query;

    // Build search query
    const query = { buildingId };

    if (q) {
      query.$or = [
        { originalName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    if (relatedType) {
      query.relatedType = relatedType;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Search photos
    const photos = await Photo.find(query)
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Photo.countDocuments(query);

    res.json({
      success: true,
      data: {
        photos,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPhotos: total,
          hasNextPage: skip + photos.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Search photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search photos',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  uploadPhoto,
  getPhoto,
  streamPhoto,
  getPhotos,
  updatePhoto,
  deletePhoto,
  getPhotoStats,
  searchPhotos
};
