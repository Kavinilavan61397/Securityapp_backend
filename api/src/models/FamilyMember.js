const mongoose = require('mongoose');

/**
 * Family Member Model
 * Represents family members of residents
 * Follows minimal mandatory fields approach: only name, phoneNumber, relation required
 */
const familyMemberSchema = new mongoose.Schema({
  // Resident who owns this family member
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Resident ID is required']
  },

  // Building context
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },

  // MANDATORY FIELDS (only 3)
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },

  relation: {
    type: String,
    required: [true, 'Relation is required'],
    enum: ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'],
    trim: true
  },

  // OPTIONAL FIELDS (everything else)
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date < new Date();
      },
      message: 'Date of birth must be in the past'
    },
    get: function(date) {
      // Return date in dd/mm/yyyy format for API responses
      if (!date) return null;
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  },

  age: {
    type: Number,
    min: [1, 'Age must be at least 1'],
    max: [120, 'Age cannot exceed 120']
  },

  gender: {
    type: String,
    enum: ['MALE', 'FEMALE', 'OTHER']
  },

  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },

  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters']
  },

  pincode: {
    type: String,
    trim: true,
    match: [/^\d{6}$/, 'Pincode must be 6 digits'],
    maxlength: [6, 'Pincode must be 6 digits']
  },

  // Additional optional fields
  occupation: {
    type: String,
    trim: true,
    maxlength: [100, 'Occupation cannot exceed 100 characters']
  },

  emergencyContact: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // Notes for additional information
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
familyMemberSchema.index({ residentId: 1 });
familyMemberSchema.index({ buildingId: 1 });
familyMemberSchema.index({ phoneNumber: 1 });
familyMemberSchema.index({ relation: 1 });

// Virtual for calculated age from dateOfBirth
familyMemberSchema.virtual('calculatedAge').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for relation display
familyMemberSchema.virtual('relationDisplay').get(function() {
  const relationMap = {
    'SPOUSE': 'Spouse',
    'CHILD': 'Child',
    'PARENT': 'Parent',
    'SIBLING': 'Sibling',
    'OTHER': 'Other'
  };
  return relationMap[this.relation] || this.relation;
});

// Pre-save middleware
familyMemberSchema.pre('save', async function(next) {
  // Calculate age from dateOfBirth if not provided
  if (this.dateOfBirth && !this.age) {
    this.age = this.calculatedAge;
  }
  next();
});

// Static methods
familyMemberSchema.statics.findByResident = function(residentId) {
  return this.find({ residentId, isActive: true }).sort({ createdAt: -1 });
};

familyMemberSchema.statics.findByBuilding = function(buildingId) {
  return this.find({ buildingId, isActive: true }).sort({ createdAt: -1 });
};

familyMemberSchema.statics.findByRelation = function(relation) {
  return this.find({ relation, isActive: true }).sort({ createdAt: -1 });
};

// Export the model
module.exports = mongoose.model('FamilyMember', familyMemberSchema);
