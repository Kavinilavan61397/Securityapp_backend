const mongoose = require('mongoose');

const blockedUserSchema = new mongoose.Schema({
  blockerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  blockedUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: function() {
      return !this.blockedPostId; // Required if not blocking a specific post
    }
  },
  blockedPostId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Post',
    required: function() {
      return !this.blockedUserId; // Required if not blocking a user
    }
  },
  buildingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Building', 
    required: true 
  },
  blockedAt: { 
    type: Date, 
    default: Date.now 
  },
  blockType: {
    type: String,
    enum: ['USER', 'POST'],
    required: true
  }
}, {
  timestamps: true
});

// Ensure one user can't block another user twice in the same building
blockedUserSchema.index({ 
  blockerId: 1, 
  blockedUserId: 1, 
  buildingId: 1 
}, { 
  unique: true,
  name: 'unique_user_block_relationship',
  partialFilterExpression: { blockType: 'USER' }
});

// Ensure one user can't block the same post twice
blockedUserSchema.index({ 
  blockerId: 1, 
  blockedPostId: 1, 
  buildingId: 1 
}, { 
  unique: true,
  name: 'unique_post_block_relationship',
  partialFilterExpression: { blockType: 'POST' }
});

// Index for efficient queries
blockedUserSchema.index({ blockerId: 1, buildingId: 1 });
blockedUserSchema.index({ blockedUserId: 1, buildingId: 1 });
blockedUserSchema.index({ blockedPostId: 1, buildingId: 1 });

module.exports = mongoose.model('BlockedUser', blockedUserSchema);
