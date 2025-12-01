const mongoose = require('mongoose');

/**
 * Pass Model - Visitor Pass Management
 * Handles visitor pass creation and management for buildings
 */

const passSchema = new mongoose.Schema({
  // Basic Visitor Information
  name: {
    type: String,
    required: [true, 'Visitor name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: false, // Made optional for visitor passes
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  
  // Visit Details
  reasonForVisit: {
    type: String,
    required: [true, 'Reason for visit is required'],
    trim: true,
    maxlength: [500, 'Reason for visit cannot exceed 500 characters']
  },
  
  startingDate: {
    type: Date,
    required: [true, 'Starting date is required']
  },
  
  endingDate: {
    type: Date,
    required: [true, 'Ending date is required']
  },
  
  checkInTime: {
    type: String,
    required: [true, 'Check-in time is required'],
    match: [/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i, 'Please enter time in HH:MM AM/PM format']
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'PENDING'
  },
  
  // Building Reference
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  
  // Creator Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // QR Code Data (same as pre-approval system)
  qrCodeData: {
    type: String,
    required: false
  },
  
  qrCodeString: {
    type: String,
    required: false
  },
  
  qrCodeImage: {
    type: String,
    required: false
  },
  
  // Soft Delete
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

// Indexes for better performance
passSchema.index({ buildingId: 1, createdAt: -1 });
passSchema.index({ createdBy: 1, buildingId: 1 });
passSchema.index({ status: 1, buildingId: 1 });
passSchema.index({ email: 1, buildingId: 1 });

// Validation: Ending date should be >= starting date
passSchema.pre('save', function(next) {
  if (this.endingDate < this.startingDate) {
    const error = new Error('Ending date cannot be before starting date');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Pass', passSchema);
