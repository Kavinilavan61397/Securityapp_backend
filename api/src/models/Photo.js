const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  // Photo Identification
  photoId: {
    type: String,
    required: [true, 'Photo ID is required'],
    unique: true,
    trim: true
  },
  
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  
  // File Information
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    default: 'image/jpeg'
  },
  
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1024, 'File size must be at least 1KB'],
    max: [10485760, 'File size cannot exceed 10MB'] // 10MB limit
  },
  
  // Upload Information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader ID is required']
  },
  
  // Photo Metadata
  width: {
    type: Number,
    min: [100, 'Image width must be at least 100px'],
    max: [4096, 'Image width cannot exceed 4096px']
  },
  
  height: {
    type: Number,
    min: [100, 'Image height must be at least 100px'],
    max: [4096, 'Image height cannot exceed 4096px']
  },
  
  // Photo Type and Usage
  relatedType: {
    type: String,
    required: false, // Made optional since it has a default value
    enum: [
      'VISITOR',
      'VISIT',
      'USER',
      'BUILDING',
      'OTHER'
    ],
    default: 'OTHER'
  },
  
  // Associated Entities
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Made optional for easier photo uploads
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  
  // Processing and Optimization
  isProcessed: {
    type: Boolean,
    default: false
  },
  
  processingStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  
  processingError: {
    type: String,
    trim: true,
    maxlength: [500, 'Processing error cannot exceed 500 characters']
  },
  
  // Thumbnail and Variants
  thumbnailId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo'
  },
  
  mediumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo'
  },
  
  // Security and Access
  isPublic: {
    type: Boolean,
    default: false
  },
  
  accessLevel: {
    type: String,
    enum: ['PUBLIC', 'BUILDING_ONLY', 'SECURITY_ONLY', 'ADMIN_ONLY', 'PRIVATE'],
    default: 'BUILDING_ONLY'
  },
  
  // Tags and Categories
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  // Location and Context
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  
  context: {
    type: String,
    trim: true,
    maxlength: [200, 'Context cannot exceed 200 characters']
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  processedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
photoSchema.index({ buildingId: 1, relatedType: 1 });
photoSchema.index({ relatedId: 1, relatedType: 1 });
photoSchema.index({ uploadedBy: 1 });
photoSchema.index({ createdAt: -1 });
photoSchema.index({ isPublic: 1, buildingId: 1 });
photoSchema.index({ photoId: 1 });

// Virtuals
photoSchema.virtual('url').get(function() {
  return `/api/photos/${this.buildingId}/${this._id}`;
});

photoSchema.virtual('streamUrl').get(function() {
  return `/api/photos/${this.buildingId}/${this._id}/stream`;
});

photoSchema.virtual('dimensions').get(function() {
  if (this.width && this.height) {
    return `${this.width}x${this.height}`;
  }
  return 'Unknown';
});

photoSchema.virtual('fileSizeMB').get(function() {
  return (this.size / (1024 * 1024)).toFixed(2);
});

photoSchema.virtual('isImage').get(function() {
  return this.mimeType && this.mimeType.startsWith('image/');
});

// Instance methods
photoSchema.methods.markAsProcessed = function() {
  this.isProcessed = true;
  this.processingStatus = 'COMPLETED';
  this.processedAt = new Date();
  return this.save();
};

photoSchema.methods.markAsFailed = function(error) {
  this.processingStatus = 'FAILED';
  this.processingError = error;
  return this.save();
};

photoSchema.methods.setDimensions = function(width, height) {
  this.width = width;
  this.height = height;
  return this.save();
};

photoSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

photoSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

photoSchema.methods.setAccessLevel = function(level) {
  this.accessLevel = level;
  this.isPublic = level === 'PUBLIC';
  return this.save();
};

// Static methods
photoSchema.statics.findByBuilding = function(buildingId, options = {}) {
  const query = { buildingId, ...options };
  return this.find(query).sort({ createdAt: -1 });
};

photoSchema.statics.findByRelated = function(relatedType, relatedId, buildingId) {
  return this.find({ relatedType, relatedId, buildingId })
    .sort({ createdAt: -1 });
};

photoSchema.statics.findByType = function(relatedType, buildingId, options = {}) {
  const query = { relatedType, buildingId, ...options };
  return this.find(query).sort({ createdAt: -1 });
};

// Pre-save middleware
photoSchema.pre('save', function(next) {
  // Validate file size
  if (this.size > 10485760) { // 10MB
    next(new Error('File size cannot exceed 10MB'));
  }
  
  // Validate content type
  if (!this.mimeType.startsWith('image/')) {
    next(new Error('Only image files are allowed'));
  }
  
  next();
});

module.exports = mongoose.model('Photo', photoSchema);
