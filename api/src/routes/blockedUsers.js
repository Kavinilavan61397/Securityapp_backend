const express = require('express');
const router = express.Router();
const { param } = require('express-validator');

const {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkIfBlocked,
  blockPost,
  unblockPost,
  getBlockedPosts
} = require('../controllers/blockedUserController');

const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
];

const validatePostId = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID')
];

// Block a user's posts
// POST /api/blocked-users/:userId
router.post('/:userId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateUserId,
  blockUser
);

// Unblock a user's posts
// DELETE /api/blocked-users/:userId
router.delete('/:userId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateUserId,
  unblockUser
);

// Get list of blocked users
// GET /api/blocked-users
router.get('/',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  getBlockedUsers
);

// Check if a specific user is blocked
// GET /api/blocked-users/:userId/status
router.get('/:userId/status',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validateUserId,
  checkIfBlocked
);

// Block a specific post
// POST /api/blocked-users/posts/:postId
router.post('/posts/:postId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validatePostId,
  blockPost
);

// Unblock a specific post
// DELETE /api/blocked-users/posts/:postId
router.delete('/posts/:postId',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  validatePostId,
  unblockPost
);

// Get list of blocked posts
// GET /api/blocked-users/posts
router.get('/posts',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  getBlockedPosts
);

module.exports = router;
