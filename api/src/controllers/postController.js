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
  const startTime = Date.now();
  console.log('=== getAllPosts started ===');
  console.log('Request user:', { id: req.user.id, buildingId: req.user.buildingId });
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.user.id;
    const buildingId = req.user.buildingId;

    console.log('Query params:', { page, limit, skip, userId, buildingId });

    // Get list of blocked user IDs and blocked post IDs for the current user
    console.log('Fetching blocked users...');
    const blockedUsersStart = Date.now();
    const blockedUsers = await BlockedUser.find({
      blockerId: userId,
      buildingId: buildingId
    }).select('blockedUserId blockedPostId blockType');
    console.log(`Blocked users query took: ${Date.now() - blockedUsersStart}ms`);

    const blockedUserIds = blockedUsers
      .filter(block => block.blockType === 'USER')
      .map(block => block.blockedUserId);
    
    const blockedPostIds = blockedUsers
      .filter(block => block.blockType === 'POST')
      .map(block => block.blockedPostId);

    console.log('Blocked data:', { blockedUserIds, blockedPostIds });

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

    console.log('Final query:', JSON.stringify(query, null, 2));

    // Get total count for pagination (excluding blocked users)
    console.log('Counting total posts...');
    const countStart = Date.now();
    const totalPosts = await Post.countDocuments(query);
    console.log(`Count query took: ${Date.now() - countStart}ms`);
    const totalPages = Math.ceil(totalPosts / limit);

    console.log('Pagination info:', { totalPosts, totalPages });

    // Get posts with pagination, sorted by newest first, excluding blocked users
    console.log('Fetching posts...');
    const postsStart = Date.now();
    const posts = await Post.find(query)
      .populate('building', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() to avoid virtual fields and improve performance
    console.log(`Posts query took: ${Date.now() - postsStart}ms`);
    console.log('Posts found:', posts.length);
    
    // Log sample post data to check for large image data
    if (posts.length > 0) {
      const samplePost = posts[0];
      console.log('Sample post structure:', {
        id: samplePost._id,
        description: samplePost.description?.substring(0, 50) + '...',
        imagesCount: samplePost.images?.length || 0,
        hasImageData: samplePost.images?.some(img => img.data) || false,
        imageDataSize: samplePost.images?.reduce((total, img) => total + (img.data?.length || 0), 0) || 0
      });
    }

    // Process posts to exclude large image data that could crash frontend
    const processedPosts = posts.map(post => {
      const processedPost = { ...post };
      
      // Remove base64 image data to prevent frontend crashes
      if (processedPost.images && processedPost.images.length > 0) {
        processedPost.images = processedPost.images.map(img => ({
          filename: img.filename,
          mimetype: img.mimetype,
          size: img.size,
          storage: img.storage,
          // Exclude large base64 data
          hasData: !!img.data,
          dataSize: img.data ? img.data.length : 0
        }));
      }
      
      return processedPost;
    });

    const responseData = {
      success: true,
      posts: processedPosts,
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
    };

    console.log('Response data structure:', {
      success: responseData.success,
      postsCount: responseData.posts.length,
      pagination: responseData.pagination,
      filters: responseData.filters
    });

    const totalTime = Date.now() - startTime;
    console.log(`=== getAllPosts completed in ${totalTime}ms ===`);

    res.status(200).json(responseData);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Error fetching posts after ${totalTime}ms:`, error);
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

// Get post images (for individual post image loading)
const getPostImages = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const buildingId = req.user.buildingId;

    const post = await Post.findOne({
      _id: postId,
      building: buildingId
    }).select('images author');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Return only image data for this specific post
    res.status(200).json({
      success: true,
      images: post.images || []
    });

  } catch (error) {
    console.error('Error fetching post images:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching post images',
      error: error.message
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  deletePost,
  getPostById,
  getMyPosts,
  getPostImages
};
