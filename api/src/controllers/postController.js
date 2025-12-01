const Post = require('../models/Post');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');
const { uploadMultipleToS3, isS3Configured, deleteFromS3 } = require('../services/s3Service');
const path = require('path');

// Helper function to process images and convert disk paths to URLs
const processPostImages = (post, req) => {
  const processedPost = post.toObject ? post.toObject() : { ...post };
  
  if (processedPost.images && processedPost.images.length > 0) {
    processedPost.images = processedPost.images.map(img => {
      // If S3 storage, return the S3 URL
      if (img.storage === 's3' && img.s3Url) {
        return {
          filename: img.filename,
          mimetype: img.mimetype,
          size: img.size,
          storage: img.storage,
          url: img.s3Url,
          s3Key: img.s3Key,
          originalName: img.originalName
        };
      }
      
      // For disk storage, convert path to accessible URL
      if (img.storage === 'disk' && img.path) {
        const filename = path.basename(img.path);
        const baseUrl = process.env.BASE_URL || (req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5000');
        const imageUrl = `${baseUrl}/api/uploads/posts/${filename}`;
        
        return {
          filename: img.filename,
          mimetype: img.mimetype,
          size: img.size,
          storage: img.storage,
          url: imageUrl,
          path: img.path
        };
      }
      
      // For memory storage
      return {
        filename: img.filename,
        mimetype: img.mimetype,
        size: img.size,
        storage: img.storage,
        hasData: !!img.data,
        dataSize: img.data ? img.data.length : 0,
        path: img.path
      };
    });
  }
  
  return processedPost;
};

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

    // Handle uploaded images - prioritize S3 if configured, otherwise fallback to existing methods
    let imageData = [];
    
    // Debug: Log file upload info
    console.log('File upload debug:', {
      hasFiles: !!req.files,
      filesLength: req.files?.length || 0,
      hasFile: !!req.file,
      filesKeys: req.files ? Object.keys(req.files) : [],
      bodyKeys: Object.keys(req.body || {}),
      contentType: req.headers['content-type'],
      rawFiles: req.files ? req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, mimetype: f.mimetype })) : []
    });
    
    // Handle both req.files (array) and req.file (single) for compatibility
    const files = req.files || (req.file ? [req.file] : []);
    
    console.log('Files received by controller:', files.length);
    if (files.length > 0) {
      console.log('File details:', files.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        hasBuffer: !!f.buffer
      })));
    }
    
    if (files && files.length > 0) {
      // Check if S3 is configured
      if (isS3Configured()) {
        try {
          // Upload to S3
          console.log('Attempting S3 upload for', files.length, 'files');
          const s3Results = await uploadMultipleToS3(files, 'posts');
          console.log('S3 upload successful:', s3Results.length, 'out of', files.length, 'files uploaded');
          
          // Map S3 results to image data format
          // Match by originalName since s3Results only contains successful uploads
          imageData = s3Results.map((s3Result) => {
            // Find the corresponding file by originalName (case-insensitive, handle path differences)
            const file = files.find(f => {
              const fileOriginalName = (f.originalname || f.filename || '').toLowerCase();
              const s3OriginalName = (s3Result.originalName || '').toLowerCase();
              // Match by name (handle cases where path might be included)
              return fileOriginalName === s3OriginalName || 
                     fileOriginalName.endsWith(s3OriginalName) ||
                     s3OriginalName.endsWith(fileOriginalName);
            });
            
            if (!file) {
              console.error('Could not find matching file for S3 result:', {
                s3OriginalName: s3Result.originalName,
                availableFiles: files.map(f => f.originalname || f.filename)
              });
              return null;
            }
            
            return {
              filename: s3Result.fileName,
              mimetype: file.mimetype,
              size: file.size,
              storage: 's3',
              s3Url: s3Result.url,
              s3Key: s3Result.key,
              originalName: s3Result.originalName
            };
          }).filter(Boolean); // Remove any null entries
          
          if (imageData.length < files.length) {
            console.warn(`Warning: Only ${imageData.length} out of ${files.length} images were successfully uploaded`);
          }
          
          console.log('Image data prepared:', imageData.length, 'images');
        } catch (s3Error) {
          console.error('S3 upload failed, falling back to local storage:', s3Error);
          console.error('S3 error details:', {
            message: s3Error.message,
            stack: s3Error.stack,
            name: s3Error.name
          });
          // Fallback to existing method if S3 fails
          imageData = files.map(file => {
            if (file.buffer) {
              return {
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                data: file.buffer.toString('base64'),
                storage: 'memory'
              };
            } else {
              return {
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path,
                storage: 'disk'
              };
            }
          });
        }
      } else {
        // S3 not configured, use existing method
        imageData = files.map(file => {
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

    // Process posts to return image URLs (S3 URLs preferred, fallback to metadata)
    const processedPosts = posts.map(post => processPostImages(post, req));

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
  const deleteStartTime = Date.now();
  console.log('=== deletePost started ===');
  
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    
    console.log('Delete request details:', {
      postId,
      userId,
      userIdType: typeof userId,
      userObject: req.user
    });

    // Validate postId format
    if (!postId || postId.length !== 24) {
      console.log('Invalid postId format:', postId);
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format'
      });
    }

    // Find the post
    console.log('Searching for post...');
    const post = await Post.findById(postId);
    
    if (!post) {
      console.log('Post not found in database');
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    console.log('Post found:', {
      postId: post._id,
      authorId: post.author._id,
      authorIdType: typeof post.author._id,
      authorIdString: post.author._id.toString(),
      userIdString: userId.toString(),
      userIdFromToken: userId,
      comparison: post.author._id.toString() === userId.toString()
    });

    // Check if user is the author
    if (post.author._id.toString() !== userId.toString()) {
      console.log('Authorization failed - user is not the author');
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    console.log('Authorization successful - proceeding with deletion');

    // Handle file deletion based on storage type
    if (post.images && post.images.length > 0) {
      const fs = require('fs');
      
      // Delete files from their respective storage locations
      for (const img of post.images) {
        if (img.storage === 's3' && img.s3Key) {
          // Delete from S3
          try {
            await deleteFromS3(img.s3Key);
            console.log(`✅ Deleted S3 object: ${img.s3Key}`);
          } catch (s3Error) {
            console.error(`❌ Failed to delete S3 object ${img.s3Key}:`, s3Error);
            // Continue deletion even if S3 delete fails
          }
        } else if (img.storage === 'disk' && img.path) {
          // Delete file from disk (traditional servers only)
          if (fs.existsSync(img.path)) {
            fs.unlinkSync(img.path);
            console.log(`✅ Deleted disk file: ${img.path}`);
          }
        }
        // Memory storage files are automatically removed when post is deleted from database
      }
    }

    // Delete the post
    console.log('Deleting post from database...');
    await Post.findByIdAndDelete(postId);

    const deleteTotalTime = Date.now() - deleteStartTime;
    console.log(`=== deletePost completed in ${deleteTotalTime}ms ===`);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    const deleteTotalTime = Date.now() - deleteStartTime;
    console.error(`Error deleting post after ${deleteTotalTime}ms:`, error);
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

    // Process images to return URLs
    const processedPost = processPostImages(post, req);

    res.status(200).json({
      success: true,
      post: processedPost
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

    // Process posts to return image URLs
    const processedPosts = posts.map(post => processPostImages(post, req));

    res.status(200).json({
      success: true,
      posts: processedPosts,
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

    // Process images to return URLs (S3 URLs preferred)
    const processedPost = processPostImages(post, req);
    const processedImages = processedPost.images || [];

    res.status(200).json({
      success: true,
      images: processedImages
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
