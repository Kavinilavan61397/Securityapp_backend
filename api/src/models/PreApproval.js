const mongoose = require('mongoose');

const preApprovalSchema = new mongoose.Schema({
  // Required fields
  visitorName: {
    type: String,
    required: [true, 'Visitor name is required'],
    trim: true,
    maxlength: [100, 'Visitor name cannot exceed 100 characters']
  },
  visitorPhone: {
    type: String,
    required: [true, 'Visitor phone number is required'],
    trim: true,
    maxlength: [15, 'Phone number cannot exceed 15 characters']
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },

  // Optional fields
  visitorEmail: {
    type: String,
    trim: true,
    maxlength: [100, 'Email cannot exceed 100 characters']
  },
  purpose: {
    type: String,
    trim: true,
    maxlength: [200, 'Purpose cannot exceed 200 characters']
  },
  expectedDate: {
    type: Date
  },
  expectedTime: {
    type: String,
    trim: true,
    maxlength: [50, 'Expected time cannot exceed 50 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },

  // Status and approval
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
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
    maxlength: [200, 'Rejection reason cannot exceed 200 characters']
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true
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
  timestamps: true
});

// Indexes for performance
preApprovalSchema.index({ residentId: 1, buildingId: 1 });
preApprovalSchema.index({ status: 1, buildingId: 1 });
preApprovalSchema.index({ expectedDate: 1 });

// Virtual for full identification
preApprovalSchema.virtual('fullIdentification').get(function() {
  return `${this.visitorName} - ${this.visitorPhone}`;
});

// Ensure virtual fields are serialized
preApprovalSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('PreApproval', preApprovalSchema);
