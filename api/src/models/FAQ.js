const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'FAQ question is required'],
    trim: true,
    maxlength: [500, 'Question cannot exceed 500 characters']
  },
  answer: {
    type: String,
    required: [true, 'FAQ answer is required'],
    trim: true,
    maxlength: [2000, 'Answer cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'FAQ category is required'],
    enum: ['GENERAL', 'ACCOUNT', 'TECHNICAL', 'SECURITY', 'VISITORS', 'COMPLAINTS', 'OTHER'],
    default: 'GENERAL'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
faqSchema.index({ category: 1, isActive: 1, order: 1 });
faqSchema.index({ isActive: 1, order: 1 });

// Virtual for formatted creation date
faqSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Ensure virtual fields are serialized
faqSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('FAQ', faqSchema);
