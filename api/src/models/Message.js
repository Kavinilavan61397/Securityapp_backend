const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Message title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Content cannot exceed 2000 characters']
  },
  
  // Message Type (Based on Figma "Previous Posts" section)
  messageType: {
    type: String,
    required: [true, 'Message type is required'],
    enum: {
      values: ['ALERT', 'ANNOUNCEMENT', 'MAINTENANCE', 'GENERAL'],
      message: 'Message type must be one of: ALERT, ANNOUNCEMENT, MAINTENANCE, GENERAL'
    },
    default: 'GENERAL'
  },
  
  // Building Assignment
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  
  // Admin who posted the message
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Posted by is required']
  },
  
  // Message Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // Priority Level
  priority: {
    type: String,
    enum: {
      values: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      message: 'Priority must be one of: LOW, MEDIUM, HIGH, URGENT'
    },
    default: 'MEDIUM'
  },
  
  // Target Audience
  targetAudience: {
    type: String,
    enum: {
      values: ['ALL_RESIDENTS', 'SPECIFIC_FLOORS', 'SPECIFIC_FLATS', 'EMPLOYEES_ONLY'],
      message: 'Target audience must be one of: ALL_RESIDENTS, SPECIFIC_FLOORS, SPECIFIC_FLATS, EMPLOYEES_ONLY'
    },
    default: 'ALL_RESIDENTS'
  },
  
  // Specific targets (if not ALL_RESIDENTS)
  specificTargets: {
    floors: [{
      type: String,
      trim: true
    }],
    flatNumbers: [{
      type: String,
      trim: true
    }],
    employeeTypes: [{
      type: String,
      enum: ['SECURITY_GUARD', 'RESIDENT_HELPER', 'TECHNICIAN', 'OTHER']
    }]
  },
  
  // Message Scheduling
  scheduledAt: {
    type: Date
  },
  
  expiresAt: {
    type: Date
  },
  
  // Additional Information
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  // Attachments (for future file uploads)
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message Statistics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    }
  },
  
  // Status Management
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

// Indexes for performance
messageSchema.index({ buildingId: 1, isActive: 1 });
messageSchema.index({ postedBy: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ priority: 1 });
messageSchema.index({ isPinned: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ scheduledAt: 1 });

// Virtual for message type display
messageSchema.virtual('messageTypeDisplay').get(function() {
  const typeMap = {
    'ALERT': 'Alert',
    'ANNOUNCEMENT': 'Announcement',
    'MAINTENANCE': 'Maintenance',
    'GENERAL': 'General'
  };
  return typeMap[this.messageType] || this.messageType;
});

// Virtual for priority display
messageSchema.virtual('priorityDisplay').get(function() {
  const priorityMap = {
    'LOW': 'Low',
    'MEDIUM': 'Medium',
    'HIGH': 'High',
    'URGENT': 'Urgent'
  };
  return priorityMap[this.priority] || this.priority;
});

// Virtual for target audience display
messageSchema.virtual('targetAudienceDisplay').get(function() {
  const audienceMap = {
    'ALL_RESIDENTS': 'All Residents',
    'SPECIFIC_FLOORS': 'Specific Floors',
    'SPECIFIC_FLATS': 'Specific Flats',
    'EMPLOYEES_ONLY': 'Employees Only'
  };
  return audienceMap[this.targetAudience] || this.targetAudience;
});

// Virtual for formatted creation date
messageSchema.virtual('createdAtFormatted').get(function() {
  if (!this.createdAt) return null;
  return this.createdAt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for time ago
messageSchema.virtual('timeAgo').get(function() {
  if (!this.createdAt) return null;
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.createdAt) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
});

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Set deletion timestamp
  if (this.isModified('isDeleted') && this.isDeleted) {
    this.deletedAt = new Date();
  }
  next();
});

// Static method to get messages by building
messageSchema.statics.getByBuilding = function(buildingId, options = {}) {
  const query = { buildingId, isActive: true, isDeleted: false };
  
  if (options.messageType) {
    query.messageType = options.messageType;
  }
  
  if (options.priority) {
    query.priority = options.priority;
  }
  
  if (options.isPinned !== undefined) {
    query.isPinned = options.isPinned;
  }
  
  return this.find(query)
    .populate([
      { path: 'buildingId', select: 'name address' },
      { path: 'postedBy', select: 'name email role' }
    ])
    .sort({ isPinned: -1, createdAt: -1 });
};

// Static method to get recent messages
messageSchema.statics.getRecent = function(buildingId, limit = 10) {
  return this.find({ 
    buildingId, 
    isActive: true, 
    isDeleted: false 
  })
  .populate([
    { path: 'buildingId', select: 'name address' },
    { path: 'postedBy', select: 'name email role' }
  ])
  .sort({ isPinned: -1, createdAt: -1 })
  .limit(limit);
};

// Instance method to increment view count
messageSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

// Instance method to like message
messageSchema.methods.like = function() {
  this.stats.likes += 1;
  return this.save();
};

// Instance method to share message
messageSchema.methods.share = function() {
  this.stats.shares += 1;
  return this.save();
};

// Instance method to get message summary
messageSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    messageType: this.messageType,
    messageTypeDisplay: this.messageTypeDisplay,
    priority: this.priority,
    priorityDisplay: this.priorityDisplay,
    targetAudience: this.targetAudience,
    targetAudienceDisplay: this.targetAudienceDisplay,
    isPinned: this.isPinned,
    isActive: this.isActive,
    tags: this.tags,
    stats: this.stats,
    createdAt: this.createdAt,
    createdAtFormatted: this.createdAtFormatted,
    timeAgo: this.timeAgo,
    scheduledAt: this.scheduledAt,
    expiresAt: this.expiresAt,
    postedBy: this.postedBy
  };
};

module.exports = mongoose.model('Message', messageSchema);
