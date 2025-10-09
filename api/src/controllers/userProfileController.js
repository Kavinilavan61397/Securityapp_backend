const User = require('../models/User');
const Photo = require('../models/Photo');
const Building = require('../models/Building');
const mongoose = require('mongoose');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * User Profile Controller
 * Handles user profile management including photo upload, update, and deletion
 */

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage for profile photos
// Use memory storage for Vercel compatibility
const storage = multer.memoryStorage();

// Configure multer upload for profile photos
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for profile photos
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile photos'), false);
    }
  }
});

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId)
      .populate('profilePhotoId', 'photoId filename originalName mimeType size base64Data storageType')
      .populate('buildingId', 'name address.city address.state')
      .select('-password -otp -passwordReset');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Add profile photo data if exists
    if (user.profilePhotoId) {
      const photo = user.profilePhotoId;
      
      // Include photo data for UI display
      user.profilePhotoData = {
        photoId: photo.photoId,
        base64Data: photo.base64Data,
        mimeType: photo.mimeType,
        size: photo.size,
        originalName: photo.originalName,
        storageType: photo.storageType
      };
      
      // Keep the URL for backward compatibility
      user.profilePhotoId.photoUrl = `/api/user-profile/me/photo`;
    }
    
    // Add building information for easier access
    if (user.buildingId) {
      user.buildingInfo = {
        buildingId: user.buildingId._id,
        buildingName: user.buildingId.name,
        city: user.buildingId.address?.city,
        state: user.buildingId.address?.state
      };
    }
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
};

// Update user profile (without photo)
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      phoneNumber,
      dateOfBirth,
      gender,
      address,
      completeAddress,
      city,
      pincode,
      flatNumber,
      tenantType
    } = req.body;
    
    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;
    if (address !== undefined) updateData.address = address;
    if (completeAddress !== undefined) updateData.completeAddress = completeAddress;
    if (city !== undefined) updateData.city = city;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (flatNumber !== undefined) updateData.flatNumber = flatNumber;
    if (tenantType !== undefined) updateData.tenantType = tenantType;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).populate('profilePhotoId', 'photoId filename originalName mimeType size');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Add profile photo URL if exists
    if (user.profilePhotoId) {
      user.profilePhotoId.photoUrl = `/api/photos/${user.buildingId}/stream/${user.profilePhotoId._id}`;
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
    
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile',
      error: error.message
    });
  }
};

// Upload profile photo
const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Delete old profile photo if exists
    if (user.profilePhotoId) {
      await Photo.findByIdAndDelete(user.profilePhotoId);
    }
    
    // Convert file buffer to base64 for Vercel compatibility
    const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    // Create photo record with base64 storage
    const photo = await Photo.create({
      photoId: `PROFILE_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      filename: `profile_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      base64Data: base64Data,
      storageType: 'base64',
      uploadedBy: userId,
      buildingId: user.buildingId,
      relatedType: 'USER',
      relatedId: userId,
      description: `Profile photo for ${user.name}`,
      tags: ['profile', 'user'],
      isPublic: false,
      accessLevel: 'PRIVATE'
    });
    
    // Update user with new photo reference
    user.profilePhotoId = photo._id;
    user.profilePicture = `/api/user-profile/me/photo-base64`;
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        photoId: photo.photoId,
        filename: photo.filename,
        originalName: photo.originalName,
        mimeType: photo.mimeType,
        size: photo.size,
        uploadedAt: photo.createdAt,
        photoUrl: `/api/photos/${user.buildingId}/stream/${photo._id}`
      }
    });
    
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: error.message
    });
  }
};

// Update profile photo
const updateProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Delete old profile photo if exists
    if (user.profilePhotoId) {
      await Photo.findByIdAndDelete(user.profilePhotoId);
    }
    
    // Convert file buffer to base64 for Vercel compatibility
    const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    // Create new photo record with base64 storage
    const photo = await Photo.create({
      photoId: `PROFILE_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      filename: `profile_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      base64Data: base64Data,
      storageType: 'base64',
      uploadedBy: userId,
      buildingId: user.buildingId,
      relatedType: 'USER',
      relatedId: userId,
      description: `Profile photo for ${user.name}`,
      tags: ['profile', 'user'],
      isPublic: false,
      accessLevel: 'PRIVATE'
    });
    
    // Update user with new photo reference
    user.profilePhotoId = photo._id;
    user.profilePicture = `/api/user-profile/me/photo`;
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        photoId: photo.photoId,
        filename: photo.filename,
        originalName: photo.originalName,
        mimeType: photo.mimeType,
        size: photo.size,
        uploadedAt: photo.createdAt,
        photoUrl: `/api/photos/${user.buildingId}/stream/${photo._id}`
      }
    });
    
  } catch (error) {
    console.error('Update profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile photo',
      error: error.message
    });
  }
};

// Delete profile photo
const deleteProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.profilePhotoId) {
      return res.status(404).json({
        success: false,
        message: 'No profile photo found'
      });
    }
    
    // Delete photo record (no file system cleanup needed for base64)
    await Photo.findByIdAndDelete(user.profilePhotoId);
    
    // Update user
    user.profilePhotoId = null;
    user.profilePicture = null;
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile photo deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile photo',
      error: error.message
    });
  }
};

// Get profile photo
const getProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).populate('profilePhotoId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.profilePhotoId) {
      return res.status(404).json({
        success: false,
        message: 'No profile photo found'
      });
    }
    
    // Handle base64 storage (Vercel compatible)
    if (user.profilePhotoId.storageType === 'base64' && user.profilePhotoId.base64Data) {
      // Extract base64 data
      const base64Data = user.profilePhotoId.base64Data.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Set appropriate headers
      res.set({
        'Content-Type': user.profilePhotoId.mimeType,
        'Content-Length': imageBuffer.length,
        'Content-Disposition': `inline; filename="${user.profilePhotoId.originalName}"`,
        'Cache-Control': 'public, max-age=31536000'
      });
      
      res.send(imageBuffer);
      return;
    }
    
    // Fallback to file system (for local development)
    res.set('Content-Type', user.profilePhotoId.mimeType);
    res.set('Content-Disposition', `inline; filename="${user.profilePhotoId.originalName}"`);
    
    const filePath = path.join(uploadsDir, 'profiles', user.profilePhotoId.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Profile photo file not found on disk'
      });
    }
    
    const readstream = fs.createReadStream(filePath);
    readstream.pipe(res);
    
    readstream.on('error', (error) => {
      console.error('Stream profile photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream profile photo',
        error: error.message
      });
    });
    
  } catch (error) {
    console.error('Get profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile photo',
      error: error.message
    });
  }
};

// Get user profile by ID (for admin purposes)
const getUserProfileById = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    
    // Check permissions
    if (requestingUser.role === 'RESIDENT' && requestingUser.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.'
      });
    }
    
    const user = await User.findById(userId)
      .populate('profilePhotoId', 'photoId filename originalName mimeType size')
      .select('-password -otp -passwordReset');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Add profile photo URL if exists
    if (user.profilePhotoId) {
      user.profilePhotoId.photoUrl = `/api/photos/${user.buildingId}/stream/${user.profilePhotoId._id}`;
    }
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Get user profile by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
};

// Upload profile photo using base64 (Vercel compatible)
const uploadProfilePhotoBase64 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { base64Data, mimeType = 'image/jpeg', originalName = 'profile.jpg' } = req.body;
    
    if (!base64Data) {
      return res.status(400).json({
        success: false,
        message: 'Base64 data is required'
      });
    }
    
    // Validate base64 format
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!base64Regex.test(base64Data)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid base64 format. Must be data:image/[type];base64,[data]'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Calculate size from base64
    const base64String = base64Data.split(',')[1];
    const size = Math.round((base64String.length * 3) / 4);
    
    // Validate size (max 5MB)
    if (size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image size cannot exceed 5MB'
      });
    }
    
    // Delete old profile photo if exists
    if (user.profilePhotoId) {
      await Photo.findByIdAndDelete(user.profilePhotoId);
    }
    
    // Create photo record with base64 data
    const photo = await Photo.create({
      photoId: `PROFILE_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      filename: `profile_${Date.now()}.jpg`,
      originalName: originalName,
      mimeType: mimeType,
      size: size,
      base64Data: base64Data,
      storageType: 'base64',
      uploadedBy: userId,
      buildingId: user.buildingId,
      relatedType: 'USER',
      relatedId: userId,
      description: `Profile photo for ${user.name}`,
      tags: ['profile', 'user'],
      isPublic: false,
      accessLevel: 'PRIVATE'
    });
    
    // Update user with new photo reference
    user.profilePhotoId = photo._id;
    user.profilePicture = `/api/user-profile/me/photo-base64/${photo._id}`;
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        photoId: photo.photoId,
        photoUrl: user.profilePicture,
        size: size,
        mimeType: mimeType,
        storageType: 'base64'
      }
    });
    
  } catch (error) {
    console.error('Upload profile photo base64 error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: error.message
    });
  }
};

// Get profile photo as base64
const getProfilePhotoBase64 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).populate('profilePhotoId');
    
    if (!user || !user.profilePhotoId) {
      return res.status(404).json({
        success: false,
        message: 'No profile photo found'
      });
    }
    
    const photo = user.profilePhotoId;
    
    if (photo.storageType === 'base64' && photo.base64Data) {
      res.json({
        success: true,
        data: {
          photoId: photo.photoId,
          base64Data: photo.base64Data,
          mimeType: photo.mimeType,
          size: photo.size,
          originalName: photo.originalName,
          storageType: photo.storageType
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Profile photo not available in base64 format'
      });
    }
    
  } catch (error) {
    console.error('Get profile photo base64 error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile photo',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  updateProfilePhoto,
  deleteProfilePhoto,
  getProfilePhoto,
  getUserProfileById,
  uploadProfilePhotoBase64,
  getProfilePhotoBase64
};
