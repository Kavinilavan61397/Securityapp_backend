const mongoose = require('mongoose');

/**
 * Househelp Schema
 * Manages househelp/domestic help workers
 * Follows minimal mandatory fields approach
 */
const househelpSchema = new mongoose.Schema({
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
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'],
    trim: true
  },
  househelpType: {
    type: String,
    required: [true, 'Househelp type is required'],
    enum: {
      values: ['MAID', 'COOK', 'DRIVER', 'GUARD', 'GARDENER', 'CLEANER', 'NANNY', 'OTHER'],
      message: 'Househelp type must be one of: MAID, COOK, DRIVER, GUARD, GARDENER, CLEANER, NANNY, OTHER'
    }
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },

  // Optional Fields
  alternatePhoneNumber: {
    type: String,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'],
    trim: true
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
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
  idType: {
    type: String,
    enum: ['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'],
    default: 'AADHAR'
  },
  idNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'ID number cannot exceed 50 characters']
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    phoneNumber: {
      type: String,
      match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'],
      trim: true
    },
    relation: {
      type: String,
      enum: ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'FRIEND', 'OTHER'],
      trim: true
    }
  },
  workSchedule: {
    startTime: {
      type: String,
      match: [/^\d{1,2}:\d{2}\s?(am|pm)$/i, 'Time must be in hh:mm am/pm format'],
      trim: true
    },
    endTime: {
      type: String,
      match: [/^\d{1,2}:\d{2}\s?(am|pm)$/i, 'Time must be in hh:mm am/pm format'],
      trim: true
    },
    workingDays: [{
      type: String,
      enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    }],
    isFullTime: {
      type: Boolean,
      default: false
    }
  },
  salary: {
    amount: {
      type: Number,
      min: [0, 'Salary amount cannot be negative']
    },
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
      default: 'MONTHLY'
    },
    currency: {
      type: String,
      default: 'INR',
      maxlength: [3, 'Currency code cannot exceed 3 characters']
    }
  },
  skills: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill cannot exceed 50 characters']
  }],
  languages: [{
    type: String,
    trim: true,
    maxlength: [50, 'Language cannot exceed 50 characters']
  }],
  experience: {
    years: {
      type: Number,
      min: [0, 'Experience years cannot be negative']
    },
    months: {
      type: Number,
      min: [0, 'Experience months cannot be negative'],
      max: [11, 'Experience months must be between 0 and 11']
    },
    previousEmployers: [{
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Previous employer name cannot exceed 100 characters']
      },
      duration: {
        type: String,
        trim: true,
        maxlength: [50, 'Duration cannot exceed 50 characters']
      },
      reference: {
        type: String,
        trim: true,
        maxlength: [200, 'Reference cannot exceed 200 characters']
      }
    }]
  },
  documents: [{
    type: {
      type: String,
      required: true,
      enum: ['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'POLICE_VERIFICATION', 'MEDICAL_CERTIFICATE', 'OTHER']
    },
    number: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Document number cannot exceed 50 characters']
    },
    issuedBy: {
      type: String,
      trim: true,
      maxlength: [100, 'Issued by cannot exceed 100 characters']
    },
    issuedDate: {
      type: Date
    },
    expiryDate: {
      type: Date
    },
    filePath: {
      type: String,
      trim: true
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  }],
  backgroundCheck: {
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedDate: {
      type: Date
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['PENDING', 'CLEAR', 'ISSUES_FOUND', 'REJECTED'],
      default: 'PENDING'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Background check notes cannot exceed 500 characters']
    }
  },
  healthStatus: {
    isHealthy: {
      type: Boolean,
      default: true
    },
    medicalCertificate: {
      type: String,
      trim: true
    },
    lastCheckup: {
      type: Date
    },
    nextCheckup: {
      type: Date
    },
    allergies: [{
      type: String,
      trim: true,
      maxlength: [100, 'Allergy cannot exceed 100 characters']
    }],
    medications: [{
      type: String,
      trim: true,
      maxlength: [100, 'Medication cannot exceed 100 characters']
    }]
  },
  workHistory: [{
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    },
    workType: {
      type: String,
      required: true,
      enum: ['MAID', 'COOK', 'DRIVER', 'GUARD', 'GARDENER', 'CLEANER', 'NANNY', 'OTHER']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Work description cannot exceed 500 characters']
    },
    performance: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR'],
      default: 'GOOD'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
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
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
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
househelpSchema.index({ buildingId: 1, househelpType: 1 });
househelpSchema.index({ buildingId: 1, ownerId: 1 });
househelpSchema.index({ buildingId: 1, isActive: 1 });
househelpSchema.index({ buildingId: 1, isVerified: 1 });
househelpSchema.index({ phoneNumber: 1 });
househelpSchema.index({ idNumber: 1 });
househelpSchema.index({ isDeleted: 1 });
househelpSchema.index({ name: 'text', phoneNumber: 'text', address: 'text' });

// Virtual for full name
househelpSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for work duration
househelpSchema.virtual('workDuration').get(function() {
  if (this.workHistory && this.workHistory.length > 0) {
    const activeWork = this.workHistory.find(work => work.isActive);
    if (activeWork) {
      const startDate = new Date(activeWork.startDate);
      const endDate = activeWork.endDate ? new Date(activeWork.endDate) : new Date();
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
  }
  return 0;
});

// Virtual for total experience
househelpSchema.virtual('totalExperience').get(function() {
  if (this.experience) {
    const totalMonths = (this.experience.years || 0) * 12 + (this.experience.months || 0);
    return totalMonths;
  }
  return 0;
});

// Virtual for current work status
househelpSchema.virtual('currentWorkStatus').get(function() {
  if (this.workHistory && this.workHistory.length > 0) {
    const activeWork = this.workHistory.find(work => work.isActive);
    return activeWork ? 'ACTIVE' : 'INACTIVE';
  }
  return 'NO_HISTORY';
});

// Pre-save middleware
househelpSchema.pre('save', function(next) {
  // Set updatedBy if not already set
  if (this.isModified() && !this.isNew && !this.updatedBy) {
    this.updatedBy = this.createdBy;
  }
  
  next();
});

// Pre-find middleware to exclude deleted entries
househelpSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Static method to find by building and type
househelpSchema.statics.findByBuildingAndType = function(buildingId, househelpType, options = {}) {
  return this.find({ buildingId, househelpType, isDeleted: { $ne: true }, ...options });
};

// Static method to find by building
househelpSchema.statics.findByBuilding = function(buildingId, options = {}) {
  return this.find({ buildingId, isDeleted: { $ne: true }, ...options });
};

// Static method to find active househelp
househelpSchema.statics.findActive = function(buildingId, options = {}) {
  return this.find({ buildingId, isActive: true, isDeleted: { $ne: true }, ...options });
};

// Instance method to soft delete
househelpSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Instance method to restore
househelpSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

// Instance method to verify
househelpSchema.methods.verify = function(verifiedBy, verificationLevel, notes) {
  this.isVerified = verificationLevel === 'VERIFIED';
  this.verificationLevel = verificationLevel;
  this.verificationNotes = notes;
  this.verifiedAt = new Date();
  this.verifiedBy = verifiedBy;
  return this.save();
};

// Instance method to add work history
househelpSchema.methods.addWorkHistory = function(workData) {
  this.workHistory.push({
    ...workData,
    startDate: new Date(workData.startDate),
    endDate: workData.endDate ? new Date(workData.endDate) : undefined
  });
  return this.save();
};

// Instance method to end current work
househelpSchema.methods.endCurrentWork = function(endDate, notes) {
  const activeWork = this.workHistory.find(work => work.isActive);
  if (activeWork) {
    activeWork.isActive = false;
    activeWork.endDate = endDate ? new Date(endDate) : new Date();
    if (notes) activeWork.notes = notes;
  }
  return this.save();
};

module.exports = mongoose.model('Househelp', househelpSchema);
