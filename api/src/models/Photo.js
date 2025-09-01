const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const photoSchema = new mongoose.Schema({
  // Photo Identification
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
  
  contentType: {
    type: String,
    required: [true, 'Content type is required'],
    default: 'image/jpeg'
  },
  
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1024, 'File size must be at least 1KB'],
    max: [10485760, 'File size cannot exceed 10MB'] // 10MB limit
  },
  
  // GridFS References
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'GridFS file ID is required']
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
  photoType: {
    type: String,
    required: [true, 'Photo type is required'],
    enum: [
      'VISITOR_PROFILE',
      'VISITOR_ENTRY',
      'VISITOR_EXIT',
      'USER_PROFILE',
      'BUILDING_IMAGE',
      'DOCUMENT_VERIFICATION',
      'OTHER'
    ],
    default: 'OTHER'
  },
  
  // Associated Entities
  visitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor'
  },
  
  visitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit'
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
photoSchema.index({ buildingId: 1, photoType: 1 });
photoSchema.index({ visitorId: 1, photoType: 1 });
photoSchema.index({ visitId: 1, photoType: 1 });
photoSchema.index({ userId: 1, photoType: 1 });
photoSchema.index({ fileId: 1 });
photoSchema.index({ isProcessed: 1, processingStatus: 1 });
photoSchema.index({ createdAt: -1 });
photoSchema.index({ accessLevel: 1, buildingId: 1 });

// Virtuals
photoSchema.virtual('url').get(function() {
  return `/api/photos/${this.fileId}`;
});

photoSchema.virtual('thumbnailUrl').get(function() {
  return this.thumbnailId ? `/api/photos/${this.thumbnailId}` : null;
});

photoSchema.virtual('mediumUrl').get(function() {
  return this.mediumId ? `/api/photos/${this.mediumId}` : null;
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
  return this.contentType && this.contentType.startsWith('image/');
});

photoSchema.virtual('canAccess').get(function() {
  // This will be implemented in middleware based on user role and permissions
  return true;
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

photoSchema.statics.findByVisitor = function(visitorId, buildingId) {
  return this.find({ visitorId, buildingId, photoType: { $in: ['VISITOR_PROFILE', 'VISITOR_ENTRY', 'VISITOR_EXIT'] } })
    .sort({ createdAt: -1 });
};

photoSchema.statics.findByVisit = function(visitId, buildingId) {
  return this.find({ visitId, buildingId, photoType: { $in: ['VISITOR_ENTRY', 'VISITOR_EXIT'] } })
    .sort({ createdAt: -1 });
};

photoSchema.statics.findByType = function(photoType, buildingId, options = {}) {
  const query = { photoType, buildingId, ...options };
  return this.find(query).sort({ createdAt: -1 });
};

photoSchema.statics.findUnprocessed = function(buildingId) {
  return this.find({
    buildingId,
    isProcessed: false,
    processingStatus: { $in: ['PENDING', 'FAILED'] }
  }).sort({ createdAt: 1 });
};

photoSchema.statics.getPhotoStats = function(buildingId, startDate, endDate) {
  const matchStage = { buildingId: new mongoose.Types.ObjectId(buildingId) };
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPhotos: { $sum: 1 },
        processedPhotos: { $sum: { $cond: [{ $eq: ['$isProcessed', true] }, 1, 0] } },
        pendingPhotos: { $sum: { $cond: [{ $eq: ['$processingStatus', 'PENDING'] }, 1, 0] } },
        failedPhotos: { $sum: { $cond: [{ $eq: ['$processingStatus', 'FAILED'] }, 1, 0] } },
        totalSize: { $sum: '$size' },
        averageSize: { $avg: '$size' }
      }
    }
  ]);
};

photoSchema.statics.cleanupOrphaned = function() {
  // This method will be implemented to clean up photos without associated entities
  return this.deleteMany({
    $or: [
      { visitorId: { $exists: false } },
      { visitId: { $exists: false } },
      { userId: { $exists: false } }
    ],
    photoType: { $ne: 'BUILDING_IMAGE' }
  });
};

// Pre-save middleware
photoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Validate file size
  if (this.size > 10485760) { // 10MB
    next(new Error('File size cannot exceed 10MB'));
  }
  
  // Validate content type
  if (!this.contentType.startsWith('image/')) {
    next(new Error('Only image files are allowed'));
  }
  
  next();
});

// Pre-save validation
photoSchema.pre('save', function(next) {
  if (this.photoType === 'VISITOR_PROFILE' && !this.visitorId) {
    next(new Error('Visitor ID is required for visitor profile photos'));
  }
  
  if (this.photoType === 'VISITOR_ENTRY' && !this.visitId) {
    next(new Error('Visit ID is required for visitor entry photos'));
  }
  
  if (this.photoType === 'VISITOR_EXIT' && !this.visitId) {
    next(new Error('Visit ID is required for visitor exit photos'));
  }
  
  next();
});

// GridFS utility methods
photoSchema.statics.getGridFSBucket = function() {
  return new GridFSBucket(mongoose.connection.db, {
    bucketName: 'photos'
  });
};

photoSchema.statics.uploadPhoto = function(file, metadata) {
  const bucket = this.getGridFSBucket();
  const uploadStream = bucket.openUploadStream(file.originalname, {
    metadata: {
      ...metadata,
      uploadedAt: new Date()
    }
  });
  
  return new Promise((resolve, reject) => {
    const chunks = [];
    uploadStream.on('data', chunk => chunks.push(chunk));
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve(uploadStream.id);
    });
    
    // Write file buffer to stream
    uploadStream.end(file.buffer);
  });
};

photoSchema.statics.downloadPhoto = function(fileId) {
  const bucket = this.getGridFSBucket();
  return bucket.openDownloadStream(fileId);
};

photoSchema.statics.deletePhoto = function(fileId) {
  const bucket = this.getGridFSBucket();
  return bucket.delete(fileId);
};

module.exports = mongoose.model('Photo', photoSchema);
