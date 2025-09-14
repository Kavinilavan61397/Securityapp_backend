const mongoose = require('mongoose');

const househelpSchema = new mongoose.Schema({
  // Required fields
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  // Optional fields
  occupation: {
    type: String,
    trim: true,
    maxlength: [100, 'Occupation cannot exceed 100 characters']
  },
  visitingTime: {
    type: String,
    trim: true,
    maxlength: [200, 'Visiting time cannot exceed 200 characters']
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
househelpSchema.index({ residentId: 1, buildingId: 1 });
househelpSchema.index({ name: 1, buildingId: 1 });

// Virtual for full identification
househelpSchema.virtual('fullIdentification').get(function() {
  return `${this.name} - ${this.occupation || 'Househelp'}`;
});

// Ensure virtual fields are serialized
househelpSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Househelp', househelpSchema);
