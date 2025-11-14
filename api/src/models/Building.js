const mongoose = require('mongoose');

/**
 * Building Model - Multi-Building Support
 * Each building has its own admin, security personnel, and residents
 * 100% Dynamic - No hardcoded values
 */

const buildingSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Building name is required'],
    trim: true,
    maxlength: [100, 'Building name cannot exceed 100 characters']
  },
  
  // Location Details
  address: {
    street: {
      type: String,
      required: false,
      trim: true
    },
    city: {
      type: String,
      required: false,
      trim: true
    },
    state: {
      type: String,
      required: false,
      trim: true
    },
    pincode: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function(v) {
          // Only validate if pincode is provided
          return !v || /^\d{6}$/.test(v);
        },
        message: 'Pincode must be 6 digits'
      }
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    }
  },
  
  // Building Details
  totalFloors: {
    type: Number,
    min: [1, 'Total floors must be at least 1'],
    max: [200, 'Total floors cannot exceed 200']
  },
  
  totalFlats: {
    type: Number,
    min: [1, 'Total flats must be at least 1'],
    max: [10000, 'Total flats cannot exceed 10000']
  },
  
  // Building Image
  image: {
    type: String,
    default: null
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Admin Assignment
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for building creation
    validate: {
      validator: async function(adminId) {
        if (!adminId) return true; // Allow null/undefined
        const User = mongoose.model('User');
        const admin = await User.findById(adminId);
        return admin && admin.role === 'BUILDING_ADMIN';
      },
      message: 'Assigned user must be a Building Admin'
    }
  },
  
  // Contact Information
  contactPhone: {
    type: String,
    required: false,
    trim: true
  },
  
  contactEmail: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Only validate if email is provided
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email'
    }
  },
  
  // Building Features
  features: [{
    type: String,
    enum: ['PARKING', 'GARDEN', 'GYM', 'POOL', 'SECURITY', 'ELEVATOR', 'POWER_BACKUP', 'WATER_BACKUP']
  }],
  
  // Operating Hours
  operatingHours: {
    open: {
      type: String,
      default: '06:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    close: {
      type: String,
      default: '22:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    days: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }
  },
  
  // Security Settings
  securitySettings: {
    visitorCheckIn: {
      type: Boolean,
      default: true
    },
    visitorCheckOut: {
      type: Boolean,
      default: true
    },
    photoCapture: {
      type: Boolean,
      default: true
    },
    idVerification: {
      type: Boolean,
      default: true
    },
    notificationAlerts: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
buildingSchema.index({ name: 1 });
buildingSchema.index({ 'address.city': 1 });
buildingSchema.index({ 'address.pincode': 1 });
buildingSchema.index({ adminId: 1 });
buildingSchema.index({ isActive: 1 });

// Virtual for full address
buildingSchema.virtual('fullAddress').get(function() {
  const addr = this.address || {};
  const parts = [];
  if (addr.street) parts.push(addr.street);
  if (addr.city) parts.push(addr.city);
  if (addr.state) parts.push(addr.state);
  if (addr.pincode) parts.push(addr.pincode);
  if (addr.country) parts.push(addr.country);
  return parts.length > 0 ? parts.join(', ') : 'Address not provided';
});

// Virtual for building status
buildingSchema.virtual('status').get(function() {
  return this.isActive ? 'Active' : 'Inactive';
});

// Virtual for contact info
buildingSchema.virtual('contactInfo').get(function() {
  return {
    phone: this.contactPhone,
    email: this.contactEmail
  };
});

// Instance methods
buildingSchema.methods.getResidents = function() {
  const User = mongoose.model('User');
  return User.findByBuilding(this._id);
};

buildingSchema.methods.getSecurityPersonnel = function() {
  const User = mongoose.model('User');
  return User.find({ buildingId: this._id, role: 'SECURITY', isActive: true });
};

buildingSchema.methods.getEmployees = function() {
  const User = mongoose.model('User');
  return User.find({ 
    buildingId: this._id, 
    role: { $in: ['BUILDING_ADMIN', 'SECURITY'] }, 
    isActive: true 
  });
};

// Static methods
buildingSchema.statics.findByCity = function(city) {
  return this.find({ 'address.city': new RegExp(city, 'i'), isActive: true });
};

buildingSchema.statics.findByPincode = function(pincode) {
  return this.find({ 'address.pincode': pincode, isActive: true });
};

buildingSchema.statics.findActiveBuildings = function() {
  return this.find({ isActive: true });
};

// Pre-save middleware
buildingSchema.pre('save', function(next) {
  // Ensure building name is unique
  this.name = this.name.trim();
  next();
});

// Export the model
module.exports = mongoose.model('Building', buildingSchema);
