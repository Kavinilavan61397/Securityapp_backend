const mongoose = require('mongoose');

/**
 * PreApproval Model
 * Manages pre-approved visitors for residents
 * Simplified version for Vercel compatibility
 */
const preApprovalSchema = new mongoose.Schema({
  // Visitor reference
  visitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor',
    required: [true, 'Visitor ID is required'],
    index: true
  },

  // Resident who pre-approved this visitor
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Resident ID is required'],
    index: true
  },

  // Building context
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required'],
    index: true
  },

  // Pre-approval details
  purpose: {
    type: String,
    trim: true,
    maxlength: [200, 'Purpose cannot exceed 200 characters']
  },

  // Validity period
  validFrom: {
    type: Date,
    default: Date.now
  },

  validUntil: {
    type: Date
  },

  // Pre-approval status
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'REVOKED', 'USED'],
    default: 'ACTIVE',
    index: true
  },

  // Usage tracking
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },

  maxUsage: {
    type: Number,
    default: 1,
    min: [1, 'Max usage must be at least 1']
  },

  // Additional details
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },

  // Emergency contact flag
  isEmergencyContact: {
    type: Boolean,
    default: false
  },

  // Auto-approve flag
  autoApprove: {
    type: Boolean,
    default: false
  },

  // Notification preferences
  notifyOnArrival: {
    type: Boolean,
    default: true
  },

  // Security notes
  securityNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Security notes cannot exceed 500 characters']
  },

  // Approval metadata
  approvedAt: {
    type: Date,
    default: Date.now
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Revocation details
  revokedAt: {
    type: Date
  },

  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  revokeReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Revoke reason cannot exceed 200 characters']
  },

  // Last used date
  lastUsedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
preApprovalSchema.index({ visitorId: 1, buildingId: 1 });
preApprovalSchema.index({ residentId: 1, status: 1 });
preApprovalSchema.index({ buildingId: 1, status: 1 });
preApprovalSchema.index({ validUntil: 1, status: 1 });

// Simple virtual for remaining usage
preApprovalSchema.virtual('remainingUsage').get(function() {
  if (!this.maxUsage || !this.usageCount) return this.maxUsage || 1;
  return Math.max(0, this.maxUsage - this.usageCount);
});

// Simple virtual for is valid
preApprovalSchema.virtual('isValid').get(function() {
  if (this.status !== 'ACTIVE') return false;
  const now = new Date();
  if (this.validFrom && this.validFrom > now) return false;
  if (this.validUntil && this.validUntil <= now) return false;
  if (this.usageCount >= this.maxUsage) return false;
  return true;
});

// Pre-save middleware
preApprovalSchema.pre('save', function(next) {
  // Check if pre-approval is expired
  if (this.status === 'ACTIVE' && this.validUntil && this.validUntil < new Date()) {
    this.status = 'EXPIRED';
  }
  
  // Validate usage count
  if (this.usageCount && this.maxUsage && this.usageCount >= this.maxUsage) {
    this.status = 'USED';
  }
  
  next();
});

// Static methods
preApprovalSchema.statics.findActiveByVisitor = function(visitorId, buildingId) {
  return this.find({ 
    visitorId, 
    buildingId, 
    status: 'ACTIVE',
    validUntil: { $gt: new Date() }
  }).sort({ validUntil: 1 });
};

preApprovalSchema.statics.findByResident = function(residentId, buildingId) {
  return this.find({ residentId, buildingId })
    .populate('visitorId', 'name phoneNumber email')
    .sort({ createdAt: -1 });
};

preApprovalSchema.statics.findByBuilding = function(buildingId, status = 'ACTIVE') {
  const query = { buildingId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('visitorId', 'name phoneNumber email')
    .populate('residentId', 'name email phoneNumber')
    .sort({ createdAt: -1 });
};

// Instance methods
preApprovalSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  
  if (this.usageCount >= this.maxUsage) {
    this.status = 'USED';
  }
  
  return this.save();
};

preApprovalSchema.methods.revoke = function(revokedBy, reason) {
  this.status = 'REVOKED';
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokeReason = reason;
  
  return this.save();
};

// Export the model
module.exports = mongoose.model('PreApproval', preApprovalSchema);