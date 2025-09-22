const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  // Basic Information (Required fields from Figma)
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
  
  // Employee Code (Auto-generated, unique) - Made optional
  employeeCode: {
    type: String,
    required: false, // Made optional
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    maxlength: [20, 'Employee code cannot exceed 20 characters']
  },
  
  // Joining Date - Made optional
  joiningDate: {
    type: Date,
    required: false // Made optional
  },
  
  // Employee Type - Made optional
  employeeType: {
    type: String,
    required: false, // Made optional
    enum: {
      values: ['SECURITY_GUARD', 'RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'],
      message: 'Employee type must be one of: SECURITY_GUARD, RESIDENT_HELPER, TECHNICIAN, OTHER'
    }
  },
  
  // Building Assignment
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  
  // Login Access Control (From Figma toggle)
  canLogin: {
    type: Boolean,
    default: false,
    required: true
  },
  
  // Status Management
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Admin who created this employee
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  
  // Additional Information
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // Employee-specific details
  department: {
    type: String,
    trim: true,
    maxlength: [50, 'Department cannot exceed 50 characters']
  },
  
  designation: {
    type: String,
    trim: true,
    maxlength: [50, 'Designation cannot exceed 50 characters']
  },
  
  // Work schedule
  workSchedule: {
    startTime: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    endTime: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    workingDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }]
  },
  
  // Emergency contact
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters']
    }
  },
  
  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
employeeSchema.index({ buildingId: 1, employeeType: 1 });
employeeSchema.index({ employeeCode: 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ createdBy: 1 });

// Virtual for employee type display
employeeSchema.virtual('employeeTypeDisplay').get(function() {
  const typeMap = {
    'SECURITY_GUARD': 'Security Guard',
    'RESIDENT_HELPER': 'Resident Helper',
    'TECHNICIAN': 'Technician',
    'OTHER': 'Other'
  };
  return typeMap[this.employeeType] || this.employeeType;
});

// Virtual for formatted joining date
employeeSchema.virtual('joiningDateFormatted').get(function() {
  if (!this.joiningDate) return null;
  return this.joiningDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
});

// Pre-save middleware to generate employee code (only if not provided)
employeeSchema.pre('save', async function(next) {
  if (this.isNew && !this.employeeCode) {
    this.employeeCode = await this.constructor.generateEmployeeCode();
  }
  next();
});

// Static method to generate unique employee code
employeeSchema.statics.generateEmployeeCode = async function() {
  let employeeCode;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate code in format: EMP + 5 random digits
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    employeeCode = `EMP${randomNum}`;
    
    // Check if code already exists
    const existingEmployee = await this.findOne({ employeeCode });
    if (!existingEmployee) {
      isUnique = true;
    }
  }
  
  return employeeCode;
};

// Static method to get employees by type
employeeSchema.statics.getByType = function(employeeType, buildingId) {
  return this.find({ 
    employeeType, 
    buildingId, 
    isActive: true 
  }).sort({ createdAt: -1 });
};

// Static method to get employees by building
employeeSchema.statics.getByBuilding = function(buildingId) {
  return this.find({ 
    buildingId, 
    isActive: true 
  }).sort({ createdAt: -1 });
};

// Instance method to check if employee can login
employeeSchema.methods.canAccessApp = function() {
  // Security guards and building admins can always login
  if (this.employeeType === 'SECURITY_GUARD') {
    return true;
  }
  
  // Other types depend on canLogin flag
  return this.canLogin;
};

// Instance method to get employee summary
employeeSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    phoneNumber: this.phoneNumber,
    employeeCode: this.employeeCode,
    employeeType: this.employeeType,
    employeeTypeDisplay: this.employeeTypeDisplay,
    joiningDate: this.joiningDate,
    joiningDateFormatted: this.joiningDateFormatted,
    canLogin: this.canLogin,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Employee', employeeSchema);
