const Post = require('../models/Post');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

// Create a new post
const createPost = async (req, res) => {
  try {
    const { description } = req.body;
    const userId = req.user.id;

    // Get user details
    const user = await User.findById(userId).select('name email building');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get building ID from JWT token (req.user.buildingId) or user.building
    const buildingId = req.user.buildingId || user.building;
    
    if (!buildingId) {
      return res.status(400).json({
        success: false,
        message: 'User must be assigned to a building to create posts'
      });
    }

    // Handle uploaded images (environment-aware)
    let imageData = [];
    if (req.files && req.files.length > 0) {
      imageData = req.files.map(file => {
        // Check if file is from memory storage (serverless) or disk storage (traditional)
        if (file.buffer) {
          // Memory storage (Vercel/AWS Lambda)
          return {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            data: file.buffer.toString('base64'),
            storage: 'memory'
          };
        } else {
          // Disk storage (traditional servers)
          return {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path, // File path on disk
            storage: 'disk'
          };
        }
      });
    }

    // Create new post
    const newPost = new Post({
      author: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      description: description,
      images: imageData,
      building: buildingId
    });

    const savedPost = await newPost.save();

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: savedPost
    });

  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: error.message
    });
  }
};

// Get all posts with pagination (filtered by blocked users)
const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.user.id;
    const buildingId = req.user.buildingId;

    // Get list of blocked user IDs and blocked post IDs for the current user
    const blockedUsers = await BlockedUser.find({
      blockerId: userId,
      buildingId: buildingId
    }).select('blockedUserId blockedPostId blockType');

    const blockedUserIds = blockedUsers
      .filter(block => block.blockType === 'USER')
      .map(block => block.blockedUserId);
    
    const blockedPostIds = blockedUsers
      .filter(block => block.blockType === 'POST')
      .map(block => block.blockedPostId);

    // Build query to exclude posts from blocked users and blocked posts
    const query = {
      building: buildingId
    };

    // If user has blocked users, exclude their posts
    if (blockedUserIds.length > 0) {
      query['author._id'] = { $nin: blockedUserIds };
    }

    // If user has blocked specific posts, exclude those posts
    if (blockedPostIds.length > 0) {
      query['_id'] = { $nin: blockedPostIds };
    }

    // Get total count for pagination (excluding blocked users)
    const totalPosts = await Post.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / limit);

    // Get posts with pagination, sorted by newest first, excluding blocked users
    const posts = await Post.find(query)
      .populate('building', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      posts: posts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalPosts: totalPosts,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit: limit
      },
      filters: {
        blockedUsersCount: blockedUserIds.length,
        blockedUserIds: blockedUserIds,
        blockedPostsCount: blockedPostIds.length,
        blockedPostIds: blockedPostIds
      }
    });

  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};

// Delete a post (only by the author)
const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user is the author
    if (post.author._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    // Handle file deletion based on storage type
    if (post.images && post.images.length > 0) {
      const fs = require('fs');
      post.images.forEach(img => {
        if (img.storage === 'disk' && img.path) {
          // Delete file from disk (traditional servers only)
          if (fs.existsSync(img.path)) {
            fs.unlinkSync(img.path);
          }
        }
        // Memory storage files are automatically removed when post is deleted from database
      });
    }

    // Delete the post
    await Post.findByIdAndDelete(postId);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting post',
      error: error.message
    });
  }
};

// Get single post by ID
const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId)
      .populate('building', 'name address');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.status(200).json({
      success: true,
      post: post
    });

  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
      error: error.message
    });
  }
};

// Get current user's posts
const getMyPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalPosts = await Post.countDocuments({ 'author._id': userId });
    const totalPages = Math.ceil(totalPosts / limit);

    // Get user's posts with pagination
    const posts = await Post.find({ 'author._id': userId })
      .populate('building', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      posts: posts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalPosts: totalPosts,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit: limit
      }
    });

  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user posts',
      error: error.message
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  deletePost,
  getPostById,
  getMyPosts
};
