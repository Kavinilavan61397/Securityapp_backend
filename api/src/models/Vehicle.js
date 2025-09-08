const mongoose = require('mongoose');

/**
 * Vehicle Schema
 * Manages vehicle information for residents
 * Follows minimal mandatory fields approach
 */
const vehicleSchema = new mongoose.Schema({
  // Mandatory Fields
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    trim: true,
    uppercase: true,
    unique: true,
    validate: {
      validator: function(v) {
        // Basic vehicle number validation (can be customized per country)
        return /^[A-Z0-9\s-]{3,20}$/.test(v);
      },
      message: 'Vehicle number must be 3-20 characters with letters, numbers, spaces, or hyphens'
    }
  },
  vehicleType: {
    type: String,
    required: [true, 'Vehicle type is required'],
    enum: {
      values: ['CAR', 'BIKE', 'SCOOTER', 'MOTORCYCLE', 'BICYCLE', 'AUTO_RICKSHAW', 'COMMERCIAL', 'OTHER'],
      message: 'Vehicle type must be one of: CAR, BIKE, SCOOTER, MOTORCYCLE, BICYCLE, AUTO_RICKSHAW, COMMERCIAL, OTHER'
    }
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },

  // Optional Fields
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  model: {
    type: String,
    trim: true,
    maxlength: [50, 'Model name cannot exceed 50 characters']
  },
  color: {
    type: String,
    trim: true,
    maxlength: [30, 'Color cannot exceed 30 characters']
  },
  year: {
    type: Number,
    min: [1900, 'Year must be 1900 or later'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  engineNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Engine number cannot exceed 50 characters']
  },
  chassisNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Chassis number cannot exceed 50 characters']
  },
  registrationDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v <= new Date();
      },
      message: 'Registration date cannot be in the future'
    }
  },
  insuranceExpiry: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v >= new Date();
      },
      message: 'Insurance expiry date cannot be in the past'
    }
  },
  permitExpiry: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v >= new Date();
      },
      message: 'Permit expiry date cannot be in the past'
    }
  },
  parkingSlot: {
    type: String,
    trim: true,
    maxlength: [20, 'Parking slot cannot exceed 20 characters']
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
  documents: [{
    type: {
      type: String,
      enum: ['RC', 'INSURANCE', 'PERMIT', 'PUC', 'OTHER'],
      required: true
    },
    documentNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Document number cannot exceed 50 characters']
    },
    documentUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Document URL cannot exceed 500 characters']
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function(v) {
          return !v || v >= new Date();
        },
        message: 'Document expiry date cannot be in the past'
      }
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },

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
vehicleSchema.index({ vehicleNumber: 1 });
vehicleSchema.index({ ownerId: 1, buildingId: 1 });
vehicleSchema.index({ buildingId: 1, isActive: 1 });
vehicleSchema.index({ vehicleType: 1 });
vehicleSchema.index({ isDeleted: 1 });

// Virtual for full vehicle identification
vehicleSchema.virtual('fullIdentification').get(function() {
  return `${this.vehicleNumber} (${this.vehicleType})`;
});

// Virtual for document status
vehicleSchema.virtual('documentStatus').get(function() {
  const now = new Date();
  const status = {
    total: this.documents.length,
    valid: 0,
    expired: 0,
    expiringSoon: 0
  };

  this.documents.forEach(doc => {
    if (!doc.expiryDate) {
      status.valid++;
    } else if (doc.expiryDate < now) {
      status.expired++;
    } else if (doc.expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      status.expiringSoon++;
    } else {
      status.valid++;
    }
  });

  return status;
});

// Pre-save middleware
vehicleSchema.pre('save', function(next) {
  // Ensure vehicle number is uppercase
  if (this.vehicleNumber) {
    this.vehicleNumber = this.vehicleNumber.toUpperCase().trim();
  }
  
  // Set updatedBy if not already set
  if (this.isModified() && !this.isNew && !this.updatedBy) {
    this.updatedBy = this.createdBy;
  }
  
  next();
});

// Pre-find middleware to exclude deleted vehicles
vehicleSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Static method to find vehicles by building
vehicleSchema.statics.findByBuilding = function(buildingId, options = {}) {
  return this.find({ buildingId, isDeleted: { $ne: true }, ...options });
};

// Static method to find vehicles by owner
vehicleSchema.statics.findByOwner = function(ownerId, options = {}) {
  return this.find({ ownerId, isDeleted: { $ne: true }, ...options });
};

// Instance method to soft delete
vehicleSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Instance method to restore
vehicleSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

module.exports = mongoose.model('Vehicle', vehicleSchema);
