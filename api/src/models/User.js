const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_ROLES = ['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT'];

// User model for pre-approval automation
const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  username: {
    type: String,
    required: false, // Made optional for display purposes
    unique: true,
    sparse: true, // Allows multiple null values
    lowercase: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
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
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  
  // Role-based System
  role: {
    type: String,
    enum: USER_ROLES,
    required: false,
    default: 'RESIDENT'
  },

  roles: {
    type: [String],
    enum: USER_ROLES,
    default: undefined
  },

  activeRole: {
    type: String,
    enum: USER_ROLES,
    default: undefined
  },
  
  // Building Assignment (for Building Admin, Security, Resident)
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: function() {
      const roles = (this.roles && this.roles.length ? this.roles : (this.role ? [this.role] : []));
      return roles.includes('BUILDING_ADMIN') || roles.includes('SECURITY');
    }
  },
  
  // Employee-specific fields
  employeeCode: {
    type: String,
    required: function() {
      const roles = (this.roles && this.roles.length ? this.roles : (this.role ? [this.role] : []));
      return roles.includes('BUILDING_ADMIN') || roles.includes('SECURITY');
    },
    unique: function() {
      const roles = (this.roles && this.roles.length ? this.roles : (this.role ? [this.role] : []));
      return roles.includes('BUILDING_ADMIN') || roles.includes('SECURITY');
    },
    sparse: true
  },
  
  // Resident-specific fields (optional)
  flatNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Flat number cannot exceed 20 characters']
  },

  blockNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Block number cannot exceed 20 characters']
  },

  societyName: {
    type: String,
    trim: true,
    maxlength: [100, 'Society name cannot exceed 100 characters']
  },

  area: {
    type: String,
    trim: true,
    maxlength: [100, 'Area cannot exceed 100 characters']
  },

  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  
  tenantType: {
    type: String,
    enum: ['OWNER', 'TENANT'],
    default: 'OWNER'
  },
  
  // Account Status
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Admin Approval Status
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  
  // Enhanced Verification System (Additive)
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationLevel: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING'
    },
    verificationNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Verification notes cannot exceed 500 characters']
    },
    verificationType: {
      type: String,
      enum: ['AUTOMATIC', 'MANUAL'],
      default: 'AUTOMATIC'
    },
    verifiedAt: {
      type: Date
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
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

  // OTP Verification System
  otpVerification: {
    phoneVerified: {
      type: Boolean,
      default: false
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    phoneOTP: {
      type: String,
      default: "1234"
    },
    emailOTP: {
      type: String,
      default: "1234"
    },
    verifiedAt: {
      type: Date
    }
  },
  
  // Password Reset System
  passwordReset: {
    token: String,
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
  profilePicture: {
    type: String,
    default: null
  },
  
  // Profile Photo Reference (links to Photo model)
  profilePhotoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
    default: null
  },
  
  // Date of Birth (from Figma design)
  dateOfBirth: {
    type: Date,
    required: function() {
      // Only require for new users (when _id doesn't exist yet)
      return !this._id;
    },
    validate: {
      validator: function(date) {
        return date < new Date();
      },
      message: 'Date of birth must be in the past'
    },
    get: function(date) {
      // Return date in dd/mm/yyyy format for API responses
      if (!date) return null;
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  },
  
  // Age (calculated from dateOfBirth)
  age: {
    type: Number,
    min: [1, 'Age must be at least 1'],
    max: [120, 'Age cannot exceed 120']
  },
  
  gender: {
    type: String,
    enum: ['MALE', 'FEMALE', 'OTHER'],
    required: function() {
      // Only require for new users (when _id doesn't exist yet)
      return !this._id;
    }
  },
  
  // Address fields (from Figma design)
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  
  completeAddress: {
    type: String,
    trim: true,
    maxlength: [500, 'Complete address cannot exceed 500 characters']
  },
  
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters']
  },
  
  pincode: {
    type: String,
    trim: true,
    match: [/^\d{6}$/, 'Pincode must be 6 digits'],
    maxlength: [6, 'Pincode must be 6 digits']
  },
  
  // Family members (sub-document array for residents)
  familyMembers: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Family member name cannot exceed 100 characters']
    },
    relation: {
      type: String,
      required: true,
      enum: ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'],
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator: function(date) {
          return date < new Date();
        },
        message: 'Date of birth must be in the past'
      }
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    flatNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Flat number cannot exceed 20 characters']
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ role: 1 });
userSchema.index({ roles: 1 });
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

// Virtual for calculated age from dateOfBirth
userSchema.virtual('calculatedAge').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for verification status (backward compatibility)
userSchema.virtual('verificationStatus').get(function() {
  return this.verification?.isVerified || this.isVerified || false;
});

// Virtual for verification level
userSchema.virtual('verificationLevel').get(function() {
  return this.verification?.verificationLevel || 'PENDING';
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Normalize roles and activeRole
  let roles = Array.isArray(this.roles) ? this.roles.filter(Boolean) : [];

  if (!roles.length && this.role) {
    roles = [this.role];
  }

  roles = roles
    .map(role => (role ? role.toUpperCase() : null))
    .filter(role => role && USER_ROLES.includes(role));

  // Ensure building admins are also residents by default
  if (roles.includes('BUILDING_ADMIN') && !roles.includes('RESIDENT')) {
    roles.push('RESIDENT');
  }

  // Fallback to RESIDENT if still empty
  if (!roles.length) {
    roles = ['RESIDENT'];
  }

  // Remove duplicates while preserving order
  const seen = new Set();
  roles = roles.filter(role => {
    if (seen.has(role)) return false;
    seen.add(role);
    return true;
  });

  this.roles = roles;

  if (!this.activeRole || !this.roles.includes(this.activeRole)) {
    // Prefer existing role if valid
    const preferredRole = this.role && this.roles.includes(this.role) ? this.role : this.roles[0];
    this.activeRole = preferredRole;
  }

  // Keep legacy role field in sync for backward compatibility
  this.role = this.activeRole;

  // Calculate age from dateOfBirth if not provided
  if (this.dateOfBirth && !this.age) {
    this.age = this.calculatedAge;
  }
  
  // Hash password if it has been modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  // Only hash OTP if it has been modified
  if (this.isModified('otp.code') && this.otp.code) {
    this.otp.code = await bcrypt.hash(this.otp.code, 10);
  }
  next();
});

// Instance methods
userSchema.methods.generateOTP = function() {
  // Generate 4-digit OTP
  let otpCode;
  
  if (process.env.STATIC_OTP) {
    // Use static OTP when STATIC_OTP environment variable is set (works in both dev and production)
    otpCode = process.env.STATIC_OTP;
  } else {
    // Use random OTP when STATIC_OTP is not set
    otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  }
  
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

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Password Reset Methods
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordReset = {
    token: resetToken,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0
  };
  
  return resetToken;
};

userSchema.methods.verifyPasswordResetToken = async function(inputToken) {
  if (!this.passwordReset || !this.passwordReset.token) {
    return false;
  }
  
  if (new Date() > this.passwordReset.expiresAt) {
    this.passwordReset = undefined;
    return false;
  }
  
  if (this.passwordReset.attempts >= 3) {
    this.passwordReset = undefined;
    return false;
  }
  
  const isValid = this.passwordReset.token === inputToken;
  
  if (!isValid) {
    this.passwordReset.attempts += 1;
  } else {
    // Token is valid, keep it for password reset
    this.passwordReset.attempts = 0;
  }
  
  return isValid;
};

userSchema.methods.clearPasswordReset = function() {
  this.passwordReset = undefined;
};

userSchema.methods.hasPermission = function(permission) {
  const rolePermissions = {
    'SUPER_ADMIN': ['all'],
    'BUILDING_ADMIN': ['manage_building', 'manage_employees', 'manage_residents', 'view_reports'],
    'SECURITY': ['manage_visitors', 'capture_photos', 'scan_qr', 'view_visits'],
    'RESIDENT': ['manage_own_visitors', 'view_own_visits', 'receive_notifications']
  };

  const roles = this.roles && this.roles.length ? this.roles : (this.role ? [this.role] : []);
  return roles.some(role => {
    const permissions = rolePermissions[role] || [];
    return permissions.includes('all') || permissions.includes(permission);
  });
};

// Static methods
userSchema.statics.findByRole = function(role) {
  return this.find({ roles: role, isActive: true });
};

userSchema.statics.findByBuilding = function(buildingId) {
  return this.find({ buildingId, isActive: true });
};

// Export the model
module.exports = mongoose.model('User', userSchema);
