const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Complaint message is required'],
    trim: true,
    maxlength: [1000, 'Complaint message cannot exceed 1000 characters']
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Resident ID is required']
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  response: {
    type: String,
    default: null,
    maxlength: [1000, 'Response cannot exceed 1000 characters']
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
complaintSchema.index({ residentId: 1, createdAt: -1 });
complaintSchema.index({ buildingId: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1 });

// Virtual for formatted creation date
complaintSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Ensure virtual fields are serialized
complaintSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Complaint', complaintSchema);
