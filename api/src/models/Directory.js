const mongoose = require('mongoose');

/**
 * Directory Schema
 * Manages building directory information (residents, contacts, etc.)
 * Follows minimal mandatory fields approach
 */
const directorySchema = new mongoose.Schema({
  // Mandatory Fields
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  directoryType: {
    type: String,
    required: [true, 'Directory type is required'],
    enum: {
      values: ['RESIDENT', 'SECURITY', 'ADMIN', 'MAINTENANCE', 'EMERGENCY', 'SERVICE', 'OTHER'],
      message: 'Directory type must be one of: RESIDENT, SECURITY, ADMIN, MAINTENANCE, EMERGENCY, SERVICE, OTHER'
    }
  },

  // Optional Fields
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  flatNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Flat number cannot exceed 20 characters']
  },
  floorNumber: {
    type: Number,
    min: [0, 'Floor number cannot be negative'],
    max: [200, 'Floor number cannot exceed 200']
  },
  designation: {
    type: String,
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters']
    },
    pincode: {
      type: String,
      trim: true,
      maxlength: [10, 'Pincode cannot exceed 10 characters']
    }
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid emergency contact phone number']
    },
    relation: {
      type: String,
      trim: true,
      maxlength: [50, 'Relation cannot exceed 50 characters']
    }
  },
  workingHours: {
    start: {
      type: String,
      trim: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
    },
    end: {
      type: String,
      trim: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
    },
    days: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Verification notes cannot exceed 500 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],

  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
directorySchema.index({ buildingId: 1, directoryType: 1 });
directorySchema.index({ buildingId: 1, isActive: 1 });
directorySchema.index({ phoneNumber: 1 });
directorySchema.index({ email: 1 });
directorySchema.index({ flatNumber: 1, buildingId: 1 });
directorySchema.index({ isDeleted: 1 });

// Virtual for full contact information
directorySchema.virtual('fullContact').get(function() {
  return `${this.name} - ${this.phoneNumber}${this.email ? ` (${this.email})` : ''}`;
});

// Virtual for address string
directorySchema.virtual('fullAddress').get(function() {
  if (!this.address.street) return '';
  return `${this.address.street}, ${this.address.city}, ${this.address.state} - ${this.address.pincode}`;
});

// Pre-save middleware
directorySchema.pre('save', function(next) {
  // Set updatedBy if not already set
  if (this.isModified() && !this.isNew && !this.updatedBy) {
    this.updatedBy = this.createdBy;
  }
  
  next();
});

// Pre-find middleware to exclude deleted entries
directorySchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Static method to find by building and type
directorySchema.statics.findByBuildingAndType = function(buildingId, directoryType, options = {}) {
  return this.find({ buildingId, directoryType, isDeleted: { $ne: true }, ...options });
};

// Static method to find by building
directorySchema.statics.findByBuilding = function(buildingId, options = {}) {
  return this.find({ buildingId, isDeleted: { $ne: true }, ...options });
};

// Instance method to soft delete
directorySchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Instance method to restore
directorySchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

module.exports = mongoose.model('Directory', directorySchema);

