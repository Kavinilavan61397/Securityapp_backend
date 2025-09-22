const mongoose = require('mongoose');
const crypto = require('crypto');

const visitSchema = new mongoose.Schema({
  // Visit Identification
  visitId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Visitor Information
  visitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor',
    required: [true, 'Visitor ID is required']
  },
  
  // Building Association
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  
  // Pre-approval Association (optional)
  preApprovalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PreApproval',
    required: false
  },
  
  // Resident/Host Information
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Host ID is required']
  },
  
  hostFlatNumber: {
    type: String,
    required: false
  },
  
  // Visit Details
  purpose: {
    type: String,
    required: [true, 'Visit purpose is required'],
    trim: true,
    maxlength: [200, 'Purpose cannot exceed 200 characters']
  },
  
  visitType: {
    type: String,
    required: [true, 'Visit type is required'],
    enum: ['PRE_APPROVED', 'WALK_IN', 'SCHEDULED'],
    default: 'WALK_IN'
  },
  
  // Approval and Status
  approvalStatus: {
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  
  // Scheduling
  scheduledDate: {
    type: Date
  },
  
  scheduledTime: {
    type: String,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9](\s?(AM|PM))?$/i, 'Please enter a valid time in HH:MM or HH:MM AM/PM format']
  },
  
  expectedDuration: {
    type: Number, // in minutes
    min: [15, 'Minimum visit duration is 15 minutes'],
    max: [1440, 'Maximum visit duration is 24 hours']
  },
  
  // Check-in/Check-out
  checkInTime: {
    type: Date
  },
  
  checkOutTime: {
    type: Date
  },
  
  actualDuration: {
    type: Number // in minutes, calculated on check-out
  },
  
  // QR Code and Security
  qrCode: {
    type: String,
    unique: true,
    required: true
  },
  
  qrCodeExpiresAt: {
    type: Date,
    required: true
  },
  
  // Photo Verification
  entryPhoto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo'
  },
  
  exitPhoto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo'
  },
  
  // Security Verification
  verifiedBySecurity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  verifiedAt: {
    type: Date
  },
  
  securityNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Security notes cannot exceed 1000 characters']
  },
  
  // Vehicle Information
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
  status: {
    type: String,
    required: true,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
    default: 'SCHEDULED'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Notifications
  notificationsSent: {
    checkIn: { type: Boolean, default: false },
    checkOut: { type: Boolean, default: false },
    host: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    admin: { type: Boolean, default: false }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
visitSchema.index({ buildingId: 1, status: 1 });
visitSchema.index({ visitorId: 1, createdAt: -1 });
visitSchema.index({ hostId: 1, status: 1 });
visitSchema.index({ qrCode: 1 });
visitSchema.index({ visitId: 1 });
visitSchema.index({ approvalStatus: 1, buildingId: 1 });
visitSchema.index({ scheduledDate: 1, buildingId: 1 });
visitSchema.index({ checkInTime: 1, buildingId: 1 });
visitSchema.index({ createdAt: -1 });

// Virtuals
visitSchema.virtual('isExpired').get(function() {
  return this.qrCodeExpiresAt && new Date() > this.qrCodeExpiresAt;
});

visitSchema.virtual('isOverdue').get(function() {
  if (!this.expectedDuration || !this.checkInTime) return false;
  const expectedEndTime = new Date(this.checkInTime.getTime() + this.expectedDuration * 60000);
  return new Date() > expectedEndTime;
});

visitSchema.virtual('visitDuration').get(function() {
  if (!this.checkInTime || !this.checkOutTime) return null;
  return Math.round((this.checkOutTime - this.checkInTime) / 60000); // in minutes
});

visitSchema.virtual('canCheckIn').get(function() {
  return this.approvalStatus === 'APPROVED' && 
         this.status === 'SCHEDULED' && 
         !this.isExpired &&
         this.isActive;
});

visitSchema.virtual('canCheckOut').get(function() {
  return this.status === 'IN_PROGRESS' && 
         this.checkInTime && 
         !this.checkOutTime;
});

// Instance methods
visitSchema.methods.generateQRCode = function() {
  const uniqueString = `${this.visitId}-${this.visitorId}-${Date.now()}`;
  this.qrCode = crypto.createHash('sha256').update(uniqueString).digest('hex').substring(0, 32);
  this.qrCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return this.save();
};

visitSchema.methods.approve = function(approvedBy) {
  this.approvalStatus = 'APPROVED';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.status = 'SCHEDULED';
  return this.save();
};

visitSchema.methods.reject = function(rejectedBy, reason) {
  this.approvalStatus = 'REJECTED';
  this.rejectionReason = reason;
  this.status = 'CANCELLED';
  this.isActive = false;
  return this.save();
};

visitSchema.methods.checkIn = function(verifiedBy, entryPhoto = null) {
  this.checkInTime = new Date();
  this.status = 'IN_PROGRESS';
  this.verifiedBySecurity = verifiedBy;
  this.verifiedAt = new Date();
  if (entryPhoto) this.entryPhoto = entryPhoto;
  return this.save();
};

visitSchema.methods.checkOut = function(exitPhoto = null) {
  this.checkOutTime = new Date();
  this.status = 'COMPLETED';
  this.isActive = false;
  if (exitPhoto) this.exitPhoto = exitPhoto;
  
  // Calculate actual duration
  if (this.checkInTime) {
    this.actualDuration = Math.round((this.checkOutTime - this.checkInTime) / 60000);
  }
  
  return this.save();
};

visitSchema.methods.cancel = function(cancelledBy, reason = null) {
  this.status = 'CANCELLED';
  this.isActive = false;
  if (reason) this.rejectionReason = reason;
  return this.save();
};

// Static methods
visitSchema.statics.findByBuilding = function(buildingId, options = {}) {
  const query = { buildingId, ...options };
  return this.find(query)
    .populate('visitorId', 'name phoneNumber email photo')
    .populate('hostId', 'name flatNumber')
    .populate('approvedBy', 'name')
    .populate('verifiedBySecurity', 'name')
    .sort({ createdAt: -1 });
};

visitSchema.statics.findByVisitor = function(visitorId, buildingId) {
  return this.find({ visitorId, buildingId })
    .populate('hostId', 'name flatNumber')
    .sort({ createdAt: -1 });
};

visitSchema.statics.findByHost = function(hostId, buildingId) {
  return this.find({ hostId, buildingId })
    .populate('visitorId', 'name phoneNumber email photo')
    .sort({ createdAt: -1 });
};

visitSchema.statics.findActiveVisits = function(buildingId) {
  return this.find({ 
    buildingId, 
    status: { $in: ['SCHEDULED', 'IN_PROGRESS'] },
    isActive: true 
  }).populate('visitorId', 'name phoneNumber email photo');
};

visitSchema.statics.getVisitStats = function(buildingId, startDate, endDate) {
  const matchStage = { buildingId: new mongoose.Types.ObjectId(buildingId) };
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalVisits: { $sum: 1 },
        approvedVisits: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'APPROVED'] }, 1, 0] } },
        rejectedVisits: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'REJECTED'] }, 1, 0] } },
        completedVisits: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
        activeVisits: { $sum: { $cond: [{ $in: ['$status', ['SCHEDULED', 'IN_PROGRESS']] }, 1, 0] } },
        walkInVisits: { $sum: { $cond: [{ $eq: ['$visitType', 'WALK_IN'] }, 1, 0] } },
        preApprovedVisits: { $sum: { $cond: [{ $eq: ['$visitType', 'PRE_APPROVED'] }, 1, 0] } }
      }
    }
  ]);
};

// Pre-save middleware
visitSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate visit ID if not exists
  if (!this.visitId) {
    this.visitId = `VISIT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  
  // Generate QR code if not exists
  if (!this.qrCode) {
    this.generateQRCode();
  }
  
  next();
});

// Pre-save validation
visitSchema.pre('save', function(next) {
  if (this.approvalStatus === 'REJECTED' && !this.rejectionReason) {
    next(new Error('Rejection reason is required when rejecting a visit'));
  }
  
  if (this.visitType === 'SCHEDULED' && !this.scheduledDate) {
    next(new Error('Scheduled date is required for scheduled visits'));
  }
  
  next();
});

module.exports = mongoose.model('Visit', visitSchema);
