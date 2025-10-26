const express = require('express');
const router = express.Router();
const { createPost, getAllPosts, deletePost, getPostById, getMyPosts, getPostImages } = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/auth');
const { uploadMultiple, handleUploadError } = require('../middleware/upload');

// Create a new post - All roles
router.post('/',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
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

// Get current user's posts - All roles
router.get('/my-posts',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  getMyPosts
);

// Get post images - All roles (for individual post image loading)
router.get('/:id/images',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  getPostImages
);

// Delete a post - All roles (own posts only)
router.delete('/:id',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  deletePost
);

module.exports = router;
