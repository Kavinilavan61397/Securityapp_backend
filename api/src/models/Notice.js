const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  // Optional fields
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },

  // Required fields
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },

  // Status field
  status: {
    type: String,
    enum: ['OPEN', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },

  // References
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Metadata
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
noticeSchema.index({ buildingId: 1, isDeleted: 1 });
noticeSchema.index({ createdBy: 1 });
noticeSchema.index({ status: 1 });
noticeSchema.index({ createdAt: -1 });

// Virtual for message preview
noticeSchema.virtual('messagePreview').get(function() {
  if (!this.message) return '';
  return this.message.length > 100 
    ? this.message.substring(0, 100) + '...' 
    : this.message;
});

module.exports = mongoose.model('Notice', noticeSchema);
