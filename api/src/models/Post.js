const mongoose = require('mongoose');
const path = require('path');

const postSchema = new mongoose.Schema({
  author: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  images: [{
    filename: {
      type: String,
      required: false
    },
    mimetype: {
      type: String,
      required: false
    },
    size: {
      type: Number,
      required: false
    },
    storage: {
      type: String,
      enum: ['memory', 'disk'],
      required: false
    },
    data: {
      type: String, // Base64 encoded image data (for memory storage)
      required: false
    },
    path: {
      type: String, // File path on disk (for disk storage)
      required: false
    }
  }],
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
postSchema.index({ createdAt: -1 }); // Sort by newest first
postSchema.index({ building: 1, createdAt: -1 }); // Building-specific posts

// Virtual for image count
postSchema.virtual('imageCount').get(function() {
  return this.images ? this.images.length : 0;
});

// Virtual for image URLs (for frontend compatibility)
postSchema.virtual('imageUrls').get(function() {
  if (!this.images || this.images.length === 0) return [];
  return this.images.map(img => {
    if (img.storage === 'memory' && img.data) {
      // Memory storage - return base64 data URL
      return `data:${img.mimetype};base64,${img.data}`;
    } else if (img.storage === 'disk' && img.path) {
      // Disk storage - return file path (you might want to serve this via a static route)
      return `/uploads/posts/${path.basename(img.path)}`;
    }
    return null;
  }).filter(url => url !== null);
});

// Ensure virtual fields are serialized
postSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
