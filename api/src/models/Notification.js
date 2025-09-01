const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification Identification
  notificationId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Recipient Information
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient ID is required']
  },
  
  recipientRole: {
    type: String,
    required: [true, 'Recipient role is required'],
    enum: ['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']
  },
  
  // Building Association
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'Building ID is required']
  },
  
  // Notification Content
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  
  // Notification Type and Category
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: [
      'VISITOR_ARRIVAL',
      'VISITOR_DEPARTURE',
      'VISIT_APPROVAL_REQUEST',
      'VISIT_APPROVED',
      'VISIT_REJECTED',
      'VISIT_CANCELLED',
      'SECURITY_ALERT',
      'SYSTEM_ALERT',
      'ADMIN_NOTIFICATION',
      'GENERAL_ANNOUNCEMENT'
    ]
  },
  
  category: {
    type: String,
    required: [true, 'Notification category is required'],
    enum: ['INFO', 'WARNING', 'ALERT', 'SUCCESS', 'ERROR'],
    default: 'INFO'
  },
  
  // Priority and Urgency
  priority: {
    type: String,
    required: [true, 'Priority level is required'],
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'],
    default: 'MEDIUM'
  },
  
  isUrgent: {
    type: Boolean,
    default: false
  },
  
  // Related Entities
  relatedVisitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit'
  },
  
  relatedVisitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor'
  },
  
  relatedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Action and Response
  actionRequired: {
    type: Boolean,
    default: false
  },
  
  actionType: {
    type: String,
    enum: ['APPROVE', 'REJECT', 'ACKNOWLEDGE', 'RESPOND', 'NONE'],
    default: 'NONE'
  },
  
  actionDeadline: {
    type: Date
  },
  
  // Delivery and Read Status
  deliveryStatus: {
    type: String,
    required: true,
    enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
    default: 'PENDING'
  },
  
  sentAt: {
    type: Date
  },
  
  deliveredAt: {
    type: Date
  },
  
  readAt: {
    type: Date
  },
  
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Delivery Channels
  deliveryChannels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  
  // Retry and Failure Handling
  retryCount: {
    type: Number,
    default: 0
  },
  
  maxRetries: {
    type: Number,
    default: 3
  },
  
  lastRetryAt: {
    type: Date
  },
  
  failureReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Failure reason cannot exceed 200 characters']
  },
  
  // Expiration and Cleanup
  expiresAt: {
    type: Date
  },
  
  isPersistent: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ recipientId: 1, deliveryStatus: 1 });
notificationSchema.index({ buildingId: 1, type: 1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ notificationId: 1 });
notificationSchema.index({ relatedVisitId: 1 });
notificationSchema.index({ relatedVisitorId: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ isUrgent: 1, buildingId: 1 });

// Virtuals
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

notificationSchema.virtual('isOverdue').get(function() {
  if (!this.actionDeadline) return false;
  return new Date() > this.actionDeadline;
});

notificationSchema.virtual('canRetry').get(function() {
  return this.retryCount < this.maxRetries && this.deliveryStatus === 'FAILED';
});

notificationSchema.virtual('isRead').get(function() {
  return this.deliveryStatus === 'READ';
});

notificationSchema.virtual('requiresAction').get(function() {
  return this.actionRequired && this.actionType !== 'NONE' && !this.isExpired;
});

// Instance methods
notificationSchema.methods.markAsSent = function() {
  this.deliveryStatus = 'SENT';
  this.sentAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsDelivered = function() {
  this.deliveryStatus = 'DELIVERED';
  this.deliveredAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsRead = function(readBy) {
  this.deliveryStatus = 'READ';
  this.readAt = new Date();
  this.readBy = readBy;
  return this.save();
};

notificationSchema.methods.markAsFailed = function(reason) {
  this.deliveryStatus = 'FAILED';
  this.failureReason = reason;
  this.lastRetryAt = new Date();
  return this.save();
};

notificationSchema.methods.retry = function() {
  if (this.canRetry) {
    this.retryCount += 1;
    this.deliveryStatus = 'PENDING';
    this.lastRetryAt = new Date();
    return this.save();
  }
  return Promise.reject(new Error('Cannot retry this notification'));
};

notificationSchema.methods.setExpiration = function(hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.save();
};

// Static methods
notificationSchema.statics.findByRecipient = function(recipientId, options = {}) {
  const query = { recipientId, ...options };
  return this.find(query)
    .populate('relatedVisitId', 'visitId purpose')
    .populate('relatedVisitorId', 'name phoneNumber')
    .populate('relatedUserId', 'name')
    .sort({ createdAt: -1 });
};

notificationSchema.statics.findByBuilding = function(buildingId, options = {}) {
  const query = { buildingId, ...options };
  return this.find(query)
    .populate('recipientId', 'name role')
    .populate('relatedVisitId', 'visitId purpose')
    .populate('relatedVisitorId', 'name phoneNumber')
    .sort({ createdAt: -1 });
};

notificationSchema.statics.findUnread = function(recipientId, buildingId) {
  return this.find({
    recipientId,
    buildingId,
    deliveryStatus: { $ne: 'READ' },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ priority: -1, createdAt: -1 });
};

notificationSchema.statics.findUrgent = function(buildingId) {
  return this.find({
    buildingId,
    isUrgent: true,
    deliveryStatus: { $ne: 'READ' },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ priority: -1, createdAt: -1 });
};

notificationSchema.statics.findByType = function(type, buildingId, options = {}) {
  const query = { type, buildingId, ...options };
  return this.find(query)
    .populate('recipientId', 'name role')
    .populate('relatedVisitId', 'visitId purpose')
    .populate('relatedVisitorId', 'name phoneNumber')
    .sort({ createdAt: -1 });
};

notificationSchema.statics.getNotificationStats = function(buildingId, startDate, endDate) {
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
        totalNotifications: { $sum: 1 },
        sentNotifications: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'SENT'] }, 1, 0] } },
        deliveredNotifications: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'DELIVERED'] }, 1, 0] } },
        readNotifications: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'READ'] }, 1, 0] } },
        failedNotifications: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'FAILED'] }, 1, 0] } },
        urgentNotifications: { $sum: { $cond: [{ $eq: ['$isUrgent', true] }, 1, 0] } },
        actionRequiredNotifications: { $sum: { $cond: [{ $eq: ['$actionRequired', true] }, 1, 0] } }
      }
    }
  ]);
};

notificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    isPersistent: false
  });
};

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate notification ID if not exists
  if (!this.notificationId) {
    this.notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  
  // Set default expiration if not set
  if (!this.expiresAt && !this.isPersistent) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default
  }
  
  // Set urgent flag based on priority
  if (this.priority === 'URGENT' || this.priority === 'CRITICAL') {
    this.isUrgent = true;
  }
  
  next();
});

// Pre-save validation
notificationSchema.pre('save', function(next) {
  if (this.actionRequired && this.actionType === 'NONE') {
    next(new Error('Action type must be specified when action is required'));
  }
  
  if (this.actionDeadline && this.actionDeadline <= new Date()) {
    next(new Error('Action deadline must be in the future'));
  }
  
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
