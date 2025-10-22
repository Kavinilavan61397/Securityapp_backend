const express = require('express');
const router = express.Router();
const { createPost, getAllPosts, deletePost, getPostById, getMyPosts } = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/auth');
const { uploadMultiple, handleUploadError } = require('../middleware/upload');

// Create a new post - RESIDENT only
router.post('/',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  uploadMultiple,
  handleUploadError,
  createPost
);

// Get all posts - All authenticated users
router.get('/',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  getAllPosts
);

// Get single post by ID - All authenticated users
router.get('/:id',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  getPostById
);

// Get current user's posts - RESIDENT only
router.get('/my-posts',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  getMyPosts
);

// Delete a post - RESIDENT only (own posts)
router.delete('/:id',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  deletePost
);

module.exports = router;
