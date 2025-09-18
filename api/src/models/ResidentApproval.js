const mongoose = require('mongoose');

const residentApprovalSchema = new mongoose.Schema({
  // Required fields from Figma "Approve Flat Resident" screen
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
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
  
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [1, 'Age must be at least 1'],
    max: [120, 'Age cannot exceed 120']
  },
  
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: {
      values: ['MALE', 'FEMALE', 'OTHER'],
      message: 'Gender must be one of: MALE, FEMALE, OTHER'
    }
  },
  
  flatNumber: {
    type: String,
    required: [true, 'Flat number is required'],
    trim: true,
    maxlength: [20, 'Flat number cannot exceed 20 characters']
  },
  
  tenantType: {
    type: String,
    required: [true, 'Tenant type is required'],
    enum: {
      values: ['OWNER', 'TENANT'],
      message: 'Tenant type must be one of: OWNER, TENANT'
    }
  },
  
  // Building Assignment
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  
  // Approval Status
  status: {
    type: String,
    required: true,
    enum: {
      values: ['PENDING', 'APPROVED', 'DENIED'],
      message: 'Status must be one of: PENDING, APPROVED, DENIED'
    },
    default: 'PENDING'
  },
  
  // Approval Details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  deniedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  deniedAt: {
    type: Date
  },
  
  // Rejection reason
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  
  // Additional Information
  idProof: {
    type: {
      type: String,
      enum: ['AADHAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'OTHER']
    },
    number: {
      type: String,
      trim: true,
      maxlength: [50, 'ID proof number cannot exceed 50 characters']
    }
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
      match: [/^\d{6}$/, 'Pincode must be 6 digits']
    }
  },
  
  // Emergency Contact
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
  
  // Additional Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Admin Notes
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  
  // Status Management
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  // Documents (for future file uploads)
  documents: [{
    type: {
      type: String,
      enum: ['ID_PROOF', 'ADDRESS_PROOF', 'OWNERSHIP_DOCUMENT', 'OTHER']
    },
    fileName: String,
    filePath: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
residentApprovalSchema.index({ buildingId: 1, status: 1 });
residentApprovalSchema.index({ email: 1 });
residentApprovalSchema.index({ phoneNumber: 1 });
residentApprovalSchema.index({ flatNumber: 1, buildingId: 1 });
residentApprovalSchema.index({ status: 1 });
residentApprovalSchema.index({ submittedAt: -1 });

// Virtual for gender display
residentApprovalSchema.virtual('genderDisplay').get(function() {
  const genderMap = {
    'MALE': 'Male',
    'FEMALE': 'Female',
    'OTHER': 'Other'
  };
  return genderMap[this.gender] || this.gender;
});

// Virtual for tenant type display
residentApprovalSchema.virtual('tenantTypeDisplay').get(function() {
  const typeMap = {
    'OWNER': 'Owner',
    'TENANT': 'Tenant'
  };
  return typeMap[this.tenantType] || this.tenantType;
});

// Virtual for status display
residentApprovalSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'PENDING': 'Pending',
    'APPROVED': 'Approved',
    'DENIED': 'Denied'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for formatted submission date
residentApprovalSchema.virtual('submittedAtFormatted').get(function() {
  if (!this.submittedAt) return null;
  return this.submittedAt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Pre-save middleware
residentApprovalSchema.pre('save', function(next) {
  // Set approval/denial timestamps
  if (this.isModified('status')) {
    if (this.status === 'APPROVED') {
      this.approvedAt = new Date();
    } else if (this.status === 'DENIED') {
      this.deniedAt = new Date();
    }
  }
  next();
});

// Static method to get pending approvals
residentApprovalSchema.statics.getPendingApprovals = function(buildingId) {
  return this.find({ 
    buildingId, 
    status: 'PENDING',
    isActive: true 
  }).sort({ submittedAt: -1 });
};

// Static method to get approvals by status
residentApprovalSchema.statics.getByStatus = function(buildingId, status) {
  return this.find({ 
    buildingId, 
    status,
    isActive: true 
  }).sort({ submittedAt: -1 });
};

// Static method to get approval statistics
residentApprovalSchema.statics.getApprovalStats = function(buildingId) {
  return this.aggregate([
    { $match: { buildingId: new mongoose.Types.ObjectId(buildingId), isActive: true } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
};

// Instance method to approve resident
residentApprovalSchema.methods.approve = function(approvedBy, adminNotes) {
  this.status = 'APPROVED';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  if (adminNotes) {
    this.adminNotes = adminNotes;
  }
  return this.save();
};

// Instance method to deny resident
residentApprovalSchema.methods.deny = function(deniedBy, rejectionReason, adminNotes) {
  this.status = 'DENIED';
  this.deniedBy = deniedBy;
  this.deniedAt = new Date();
  if (rejectionReason) {
    this.rejectionReason = rejectionReason;
  }
  if (adminNotes) {
    this.adminNotes = adminNotes;
  }
  return this.save();
};

// Instance method to get approval summary
residentApprovalSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phoneNumber: this.phoneNumber,
    age: this.age,
    gender: this.gender,
    genderDisplay: this.genderDisplay,
    flatNumber: this.flatNumber,
    tenantType: this.tenantType,
    tenantTypeDisplay: this.tenantTypeDisplay,
    status: this.status,
    statusDisplay: this.statusDisplay,
    submittedAt: this.submittedAt,
    submittedAtFormatted: this.submittedAtFormatted,
    approvedAt: this.approvedAt,
    deniedAt: this.deniedAt,
    rejectionReason: this.rejectionReason,
    adminNotes: this.adminNotes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('ResidentApproval', residentApprovalSchema);
