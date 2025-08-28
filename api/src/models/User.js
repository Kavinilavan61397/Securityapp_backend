const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model - 4-Tier Role System
 * Super Admin → Building Admin → Security → Resident
 * 100% Dynamic - No hardcoded values
 */

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  
  // Role-based System
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT'],
    required: [true, 'User role is required'],
    default: 'RESIDENT'
  },
  
  // Building Assignment (for Building Admin, Security, Resident)
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: function() {
      return ['BUILDING_ADMIN', 'SECURITY', 'RESIDENT'].includes(this.role);
    }
  },
  
  // Employee-specific fields
  employeeCode: {
    type: String,
    required: function() {
      return ['BUILDING_ADMIN', 'SECURITY'].includes(this.role);
    },
    unique: function() {
      return ['BUILDING_ADMIN', 'SECURITY'].includes(this.role);
    },
    sparse: true
  },
  
  // Resident-specific fields
  flatNumber: {
    type: String,
    required: function() {
      return this.role === 'RESIDENT';
    }
  },
  
  tenantType: {
    type: String,
    enum: ['OWNER', 'TENANT'],
    required: function() {
      return this.role === 'RESIDENT';
    }
  },
  
  // Account Status
  isVerified: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // OTP System
  otp: {
    code: String,
    expiresAt: Date,
    attempts: {
      type: Number,
      default: 0
    }
  },
  
  // Login Access Control
  canLogin: {
    type: Boolean,
    default: true
  },
  
  lastLoginAt: Date,
  
  // Profile
  profilePicture: String,
  age: {
    type: Number,
    min: [1, 'Age must be at least 1'],
    max: [120, 'Age cannot exceed 120']
  },
  
  gender: {
    type: String,
    enum: ['MALE', 'FEMALE', 'OTHER']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ role: 1 });
userSchema.index({ buildingId: 1 });
userSchema.index({ employeeCode: 1 }, { sparse: true });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for role display
userSchema.virtual('roleDisplay').get(function() {
  const roleMap = {
    'SUPER_ADMIN': 'Super Admin',
    'BUILDING_ADMIN': 'Building Admin',
    'SECURITY': 'Security Personnel',
    'RESIDENT': 'Resident'
  };
  return roleMap[this.role] || this.role;
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Only hash OTP if it has been modified
  if (this.isModified('otp.code') && this.otp.code) {
    this.otp.code = await bcrypt.hash(this.otp.code, 10);
  }
  next();
});

// Instance methods
userSchema.methods.generateOTP = function() {
  // Generate 4-digit OTP
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  
  this.otp = {
    code: otpCode,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    attempts: 0
  };
  
  return otpCode;
};

userSchema.methods.verifyOTP = async function(inputOTP) {
  if (!this.otp || !this.otp.code) {
    return false;
  }
  
  if (new Date() > this.otp.expiresAt) {
    this.otp = undefined;
    return false;
  }
  
  if (this.otp.attempts >= 3) {
    this.otp = undefined;
    return false;
  }
  
  const isValid = await bcrypt.compare(inputOTP, this.otp.code);
  
  if (isValid) {
    this.otp = undefined;
    this.lastLoginAt = new Date();
  } else {
    this.otp.attempts += 1;
  }
  
  return isValid;
};

userSchema.methods.hasPermission = function(permission) {
  const rolePermissions = {
    'SUPER_ADMIN': ['all'],
    'BUILDING_ADMIN': ['manage_building', 'manage_employees', 'manage_residents', 'view_reports'],
    'SECURITY': ['manage_visitors', 'capture_photos', 'scan_qr', 'view_visits'],
    'RESIDENT': ['manage_own_visitors', 'view_own_visits', 'receive_notifications']
  };
  
  const permissions = rolePermissions[this.role] || [];
  return permissions.includes('all') || permissions.includes(permission);
};

// Static methods
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

userSchema.statics.findByBuilding = function(buildingId) {
  return this.find({ buildingId, isActive: true });
};

// Export the model
module.exports = mongoose.model('User', userSchema);
