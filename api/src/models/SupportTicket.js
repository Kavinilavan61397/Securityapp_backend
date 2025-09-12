const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Support message is required'],
    trim: true,
    maxlength: [1000, 'Support message cannot exceed 1000 characters']
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
  category: {
    type: String,
    enum: ['GENERAL', 'TECHNICAL', 'ACCOUNT', 'EMERGENCY', 'OTHER'],
    default: 'GENERAL'
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
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
supportTicketSchema.index({ residentId: 1, createdAt: -1 });
supportTicketSchema.index({ buildingId: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });

// Virtual for formatted creation date
supportTicketSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Ensure virtual fields are serialized
supportTicketSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
