const mongoose = require('mongoose');

const flatSchema = new mongoose.Schema({
  // Required fields
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  flatNumber: {
    type: String,
    required: [true, 'Flat number is required'],
    trim: true,
    maxlength: [20, 'Flat number cannot exceed 20 characters']
  },

  // Optional fields
  blockNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Block number cannot exceed 50 characters']
  },
  relation: {
    type: String,
    trim: true,
    maxlength: [50, 'Relation cannot exceed 50 characters']
  },
  age: {
    type: Number,
    min: [0, 'Age cannot be negative'],
    max: [150, 'Age cannot exceed 150']
  },
  phoneNumber: {
    type: String,
    trim: true,
    maxlength: [15, 'Phone number cannot exceed 15 characters']
  },

  // References
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
flatSchema.index({ residentId: 1, buildingId: 1 });
flatSchema.index({ flatNumber: 1, buildingId: 1 });

// Virtual for full identification
flatSchema.virtual('fullIdentification').get(function() {
  return `${this.name} - ${this.flatNumber}`;
});

// Ensure virtual fields are serialized
flatSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Flat', flatSchema);
