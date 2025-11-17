const BlockedUser = require('../models/BlockedUser');
const User = require('../models/User');

// Block a user's posts
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;
    const buildingId = req.user.buildingId;

    // Check if user is trying to block themselves
    if (blockerId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    // Check if the user to be blocked exists and is in the same building
    const userToBlock = await User.findById(userId).select('name email building');
    if (!userToBlock) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if users are in the same building
    if (userToBlock.building.toString() !== buildingId) {
      return res.status(400).json({
        success: false,
        message: 'You can only block users from your building'
      });
    }

    // Check if already blocked
    const existingBlock = await BlockedUser.findOne({
      blockerId,
      blockedUserId: userId,
      buildingId
    });

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    // Create the block relationship
    const blockedUser = new BlockedUser({
      blockerId,
      blockedUserId: userId,
      buildingId,
      blockType: 'USER'
    });

    await blockedUser.save();

    res.status(200).json({
      success: true,
      message: `You have blocked ${userToBlock.name}'s posts`,
      data: {
        blockedUserId: userId,
        blockedUserName: userToBlock.name,
        blockedAt: blockedUser.blockedAt
      }
    });

  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Unblock a user's posts
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;
    const buildingId = req.user.buildingId;

    // Find and remove the block relationship
    const blockedUser = await BlockedUser.findOneAndDelete({
      blockerId,
      blockedUserId: userId,
      buildingId
    });

    if (!blockedUser) {
      return res.status(404).json({
        success: false,
        message: 'User is not blocked'
      });
    }

    // Get the unblocked user's name for response
    const unblockedUser = await User.findById(userId).select('name');

    res.status(200).json({
      success: true,
      message: `You have unblocked ${unblockedUser.name}'s posts`,
      data: {
        unblockedUserId: userId,
        unblockedUserName: unblockedUser.name,
        unblockedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get list of blocked users
const getBlockedUsers = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const buildingId = req.user.buildingId;

    const blockedUsers = await BlockedUser.find({
      blockerId,
      buildingId
    })
    .populate('blockedUserId', 'name email')
    .select('blockedUserId blockedAt')
    .sort({ blockedAt: -1 });

    const blockedUsersList = blockedUsers.map(block => ({
      userId: block.blockedUserId._id,
      name: block.blockedUserId.name,
      email: block.blockedUserId.email,
      blockedAt: block.blockedAt
    }));

    res.status(200).json({
      success: true,
      message: 'Blocked users retrieved successfully',
      data: {
        blockedUsers: blockedUsersList,
        totalBlocked: blockedUsersList.length
      }
    });

  } catch (error) {
    console.error('Error getting blocked users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check if a user is blocked
const checkIfBlocked = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;
    const buildingId = req.user.buildingId;

    const isBlocked = await BlockedUser.findOne({
      blockerId,
      blockedUserId: userId,
      buildingId
    });

    res.status(200).json({
      success: true,
      message: 'Block status retrieved successfully',
      data: {
        isBlocked: !!isBlocked,
        blockedAt: isBlocked ? isBlocked.blockedAt : null
      }
    });

  } catch (error) {
    console.error('Error checking block status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Block a specific post
const blockPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const blockerId = req.user.id;
    const buildingId = req.user.buildingId;

    // Check if the post exists and get its author
    const Post = require('../models/Post');
    const post = await Post.findById(postId).select('author building');
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if users are in the same building
    console.log('🔍 Debug - Building comparison:');
    console.log('  post.building:', post.building);
    console.log('  buildingId:', buildingId);
    console.log('  post.building.toString():', post.building?.toString());
    console.log('  buildingId.toString():', buildingId?.toString());
    
    if (post.building?.toString() !== buildingId?.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You can only block posts from your building',
        debug: {
          postBuilding: post.building?.toString(),
          userBuilding: buildingId?.toString(),
          areEqual: post.building?.toString() === buildingId?.toString()
        }
      });
    }

    // Check if the post author is already blocked (USER type)
    const existingUserBlock = await BlockedUser.findOne({
      blockerId,
      blockedUserId: post.author._id || post.author,
      buildingId,
      blockType: 'USER'
    });

    if (existingUserBlock) {
      return res.status(400).json({
        success: false,
        message: 'This user is already blocked. All their posts are already hidden.'
      });
    }

    // Check if this specific post is already blocked
    const existingPostBlock = await BlockedUser.findOne({
      blockerId,
      blockedPostId: postId,
      buildingId,
      blockType: 'POST'
    });

    if (existingPostBlock) {
      return res.status(400).json({
        success: false,
        message: 'Post is already blocked'
      });
    }

    // Create the block relationship for specific post
    // Don't set blockedUserId to avoid unique index conflicts
    const blockedUser = new BlockedUser({
      blockerId,
      blockedPostId: postId,
      buildingId,
      blockType: 'POST'
    });

    await blockedUser.save();

    res.status(200).json({
      success: true,
      message: 'Post blocked successfully',
      data: {
        blockedPostId: postId,
        blockedAt: blockedUser.blockedAt
      }
    });

  } catch (error) {
    console.error('Error blocking post:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Unblock a specific post
const unblockPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const blockerId = req.user.id;
    const buildingId = req.user.buildingId;

    // Find and remove the block relationship for specific post
    const blockedUser = await BlockedUser.findOneAndDelete({
      blockerId,
      blockedPostId: postId,
      buildingId
    });

    if (!blockedUser) {
      return res.status(404).json({
        success: false,
        message: 'Post is not blocked'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Post unblocked successfully',
      data: {
        unblockedPostId: postId,
        unblockedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error unblocking post:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get list of blocked posts
const getBlockedPosts = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const buildingId = req.user.buildingId;

    const blockedPosts = await BlockedUser.find({
      blockerId,
      buildingId,
      blockedPostId: { $exists: true } // Only posts, not users
    })
    .populate('blockedPostId', 'description createdAt author')
    .populate('blockedUserId', 'name email')
    .select('blockedPostId blockedUserId blockedAt')
    .sort({ blockedAt: -1 });

    const blockedPostsList = blockedPosts.map(block => ({
      postId: block.blockedPostId._id,
      description: block.blockedPostId.description,
      author: {
        userId: block.blockedUserId._id,
        name: block.blockedUserId.name,
        email: block.blockedUserId.email
      },
      blockedAt: block.blockedAt
    }));

    res.status(200).json({
      success: true,
      message: 'Blocked posts retrieved successfully',
      data: {
        blockedPosts: blockedPostsList,
        totalBlocked: blockedPostsList.length
      }
    });

  } catch (error) {
    console.error('Error getting blocked posts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkIfBlocked,
  blockPost,
  unblockPost,
  getBlockedPosts
};
