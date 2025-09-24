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
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profileDir = path.join(uploadsDir, 'profiles');
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex') + '_' + Date.now();
    const filename = `profile_${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

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
      .populate('profilePhotoId', 'photoId filename originalName mimeType size photoUrl')
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
    
    // Create photo record
    const photo = await Photo.create({
      photoId: `PROFILE_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
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
    user.profilePicture = `/api/photos/${user.buildingId}/stream/${photo._id}`;
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
      const oldPhoto = await Photo.findById(user.profilePhotoId);
      if (oldPhoto) {
        // Delete file from disk
        const oldFilePath = path.join(uploadsDir, 'profiles', oldPhoto.filename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
        await Photo.findByIdAndDelete(user.profilePhotoId);
      }
    }
    
    // Create new photo record
    const photo = await Photo.create({
      photoId: `PROFILE_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
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
    user.profilePicture = `/api/photos/${user.buildingId}/stream/${photo._id}`;
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
    
    // Get photo details
    const photo = await Photo.findById(user.profilePhotoId);
    if (photo) {
      // Delete file from disk
      const filePath = path.join(uploadsDir, 'profiles', photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete photo record
      await Photo.findByIdAndDelete(user.profilePhotoId);
    }
    
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
    
    // Set appropriate headers
    res.set('Content-Type', user.profilePhotoId.mimeType);
    res.set('Content-Disposition', `inline; filename="${user.profilePhotoId.originalName}"`);
    
    // Stream the file from local storage
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

module.exports = {
  upload,
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  updateProfilePhoto,
  deleteProfilePhoto,
  getProfilePhoto,
  getUserProfileById
};
