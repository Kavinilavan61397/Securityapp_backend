const mongoose = require('mongoose');

// Visitor model for pre-approval automation
const visitorSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Visitor name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  phoneNumber: {
    type: String,
    required: false,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  
  email: {
    type: String,
    required: false,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // New Date and Time Fields
  Date: {
    type: String,
    trim: true,
    match: [/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in dd/mm/yyyy format']
  },
  
  Time: {
    type: String,
    trim: true,
    match: [/^\d{1,2}:\d{2}\s?(am|pm)$/i, 'Time must be in hh:mm am/pm format']
  },
  
  // Identification
  idType: {
    type: String,
    enum: ['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'],
    default: 'AADHAR'
  },
  
  idNumber: {
    type: String,
    trim: true
  },
  
  // Photo Storage
  photo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
    required: false // Changed from true to false - photo is optional
  },
  
  // Building Association
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building'
  },
  
  // Visit Information
  purpose: {
    type: String,
    trim: true,
    maxlength: [200, 'Purpose cannot exceed 200 characters']
  },

  // Visitor Categorization (NEW - Figma Required)
  visitorCategory: {
    type: String,
    required: false,
    enum: ['CAB_DRIVER', 'DELIVERY_AGENT', 'FLAT_EMPLOYEE', 'OTHER'],
    default: 'OTHER'
  },

  serviceType: {
    type: String,
    trim: true,
    maxlength: [50, 'Service type cannot exceed 50 characters']
  },

  // Employee-specific fields (for FLAT_EMPLOYEE category)
  employeeCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Employee code cannot exceed 20 characters']
  },

  flatNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Flat number cannot exceed 20 characters']
  },

  // Vehicle Information (for CAB_DRIVER and DELIVERY_AGENT)
  vehicleNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Vehicle number cannot exceed 20 characters']
  },

  vehicleType: {
    type: String,
    enum: ['CAR', 'BIKE', 'SCOOTER', 'AUTO', 'OTHER'],
    default: 'OTHER'
  },
  
  // Status and Tracking
  isActive: {
    type: Boolean,
    default: true
  },
  
  isBlacklisted: {
    type: Boolean,
    default: false
  },

  // Approval Status - reflects the latest visit approval status
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'DENIED'],
    default: 'PENDING'
  },
  
  blacklistReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Blacklist reason cannot exceed 500 characters']
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  lastVisitAt: {
    type: Date
  },
  
  // Statistics
  totalVisits: {
    type: Number,
    default: 0
  },
  
  // Additional Information
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  
  vehicleNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Vehicle number cannot exceed 20 characters']
  },
  
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
visitorSchema.index({ buildingId: 1, isActive: 1 });
visitorSchema.index({ phoneNumber: 1, buildingId: 1 });
visitorSchema.index({ email: 1, buildingId: 1 });
visitorSchema.index({ idNumber: 1, idType: 1 });
visitorSchema.index({ isBlacklisted: 1, buildingId: 1 });
visitorSchema.index({ createdAt: -1 });

// Virtuals
visitorSchema.virtual('status').get(function() {
  if (this.isBlacklisted) return 'Blacklisted';
  if (!this.isActive) return 'Inactive';
  return 'Active';
});

visitorSchema.virtual('fullContactInfo').get(function() {
  return {
    name: this.name,
    phone: this.phoneNumber,
    email: this.email,
    company: this.company
  };
});

// Instance methods
visitorSchema.methods.updateVisitCount = function() {
  this.totalVisits += 1;
  this.lastVisitAt = new Date();
  return this.save();
};


visitorSchema.methods.blacklist = function(reason) {
  this.isBlacklisted = true;
  this.blacklistReason = reason;
  this.isActive = false;
  return this.save();
};

visitorSchema.methods.activate = function() {
  this.isActive = true;
  this.isBlacklisted = false;
  this.blacklistReason = undefined;
  return this.save();
};

// Static methods
visitorSchema.statics.findByBuilding = function(buildingId, options = {}) {
  const { skip = 0, limit = 10, sort = { createdAt: -1 }, ...queryOptions } = options;
  
  const query = { buildingId, ...queryOptions };
  
  return this.find(query)
    .skip(skip)
    .limit(limit)
    .sort(sort)
    .populate({
      path: 'photo',
      select: 'url thumbnail',
      options: { lean: true } // Use lean() for better performance
    });
};

visitorSchema.statics.findByPhone = function(phoneNumber, buildingId) {
  return this.findOne({ phoneNumber, buildingId });
};

visitorSchema.statics.findBlacklisted = function(buildingId) {
  return this.find({ buildingId, isBlacklisted: true });
};

visitorSchema.statics.getVisitorStats = function(buildingId) {
  return this.aggregate([
    { $match: { buildingId: new mongoose.Types.ObjectId(buildingId) } },
    {
      $group: {
        _id: null,
        totalVisitors: { $sum: 1 },
        activeVisitors: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        blacklistedVisitors: { $sum: { $cond: [{ $eq: ['$isBlacklisted', true] }, 1, 0] } },
        totalVisits: { $sum: '$totalVisits' }
      }
    }
  ]);
};

// Pre-save middleware
visitorSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save validation
visitorSchema.pre('save', function(next) {
  if (this.isBlacklisted && !this.blacklistReason) {
    next(new Error('Blacklist reason is required when blacklisting a visitor'));
  }
  next();
});

module.exports = mongoose.model('Visitor', visitorSchema);
