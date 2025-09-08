const mongoose = require('mongoose');

/**
 * Communication Schema
 * Manages building communications, notices, announcements
 * Follows minimal mandatory fields approach
 */
const communicationSchema = new mongoose.Schema({
  // Mandatory Fields
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  communicationType: {
    type: String,
    required: [true, 'Communication type is required'],
    enum: {
      values: ['NOTICE', 'ANNOUNCEMENT', 'EMERGENCY', 'MAINTENANCE', 'EVENT', 'GENERAL'],
      message: 'Communication type must be one of: NOTICE, ANNOUNCEMENT, EMERGENCY, MAINTENANCE, EVENT, GENERAL'
    }
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: {
      values: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      message: 'Priority must be one of: LOW, MEDIUM, HIGH, URGENT'
    },
    default: 'MEDIUM'
  },

  // Optional Fields
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  targetAudience: {
    type: String,
    enum: ['ALL', 'RESIDENTS', 'SECURITY', 'ADMIN', 'MAINTENANCE', 'SPECIFIC'],
    default: 'ALL'
  },
  specificRecipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  scheduledDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isRead: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    filename: {
      type: String,
      required: true,
      trim: true
    },
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  relatedCommunications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Communication'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },

  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
communicationSchema.index({ buildingId: 1, communicationType: 1 });
communicationSchema.index({ buildingId: 1, priority: 1 });
communicationSchema.index({ buildingId: 1, isActive: 1 });
communicationSchema.index({ buildingId: 1, isPinned: 1 });
communicationSchema.index({ scheduledDate: 1 });
communicationSchema.index({ expiryDate: 1 });
communicationSchema.index({ createdBy: 1 });
communicationSchema.index({ isDeleted: 1 });
communicationSchema.index({ title: 'text', content: 'text', category: 'text' });

// Virtual for read count
communicationSchema.virtual('readCount').get(function() {
  return this.isRead ? this.isRead.length : 0;
});

// Virtual for like count
communicationSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
communicationSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for attachment count
communicationSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

// Virtual for is expired
communicationSchema.virtual('isExpired').get(function() {
  return this.expiryDate ? new Date() > this.expiryDate : false;
});

// Virtual for is scheduled
communicationSchema.virtual('isScheduled').get(function() {
  return this.scheduledDate ? new Date() < this.scheduledDate : false;
});

// Pre-save middleware
communicationSchema.pre('save', function(next) {
  // Set updatedBy if not already set
  if (this.isModified() && !this.isNew && !this.updatedBy) {
    this.updatedBy = this.createdBy;
  }
  
  next();
});

// Pre-find middleware to exclude deleted entries
communicationSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Static method to find by building and type
communicationSchema.statics.findByBuildingAndType = function(buildingId, communicationType, options = {}) {
  return this.find({ buildingId, communicationType, isDeleted: { $ne: true }, ...options });
};

// Static method to find by building
communicationSchema.statics.findByBuilding = function(buildingId, options = {}) {
  return this.find({ buildingId, isDeleted: { $ne: true }, ...options });
};

// Static method to find active communications
communicationSchema.statics.findActive = function(buildingId, options = {}) {
  const now = new Date();
  return this.find({ 
    buildingId, 
    isActive: true,
    isDeleted: { $ne: true },
    $or: [
      { scheduledDate: { $exists: false } },
      { scheduledDate: { $lte: now } }
    ],
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gt: now } }
    ],
    ...options 
  });
};

// Instance method to soft delete
communicationSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Instance method to restore
communicationSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

// Instance method to mark as read
communicationSchema.methods.markAsRead = function(userId) {
  if (!this.isRead.some(read => read.user.toString() === userId.toString())) {
    this.isRead.push({ user: userId, readAt: new Date() });
    this.views += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to add like
communicationSchema.methods.addLike = function(userId) {
  if (!this.likes.some(like => like.user.toString() === userId.toString())) {
    this.likes.push({ user: userId, likedAt: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove like
communicationSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  return this.save();
};

// Instance method to add comment
communicationSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content: content,
    createdAt: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('Communication', communicationSchema);

