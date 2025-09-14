const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createFlat, getFlats, deleteFlat } = require('../controllers/flatController');

const router = express.Router();

// Validation middleware
const validateBuildingId = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format')
];

const validateFlatId = [
  param('flatId')
    .isMongoId()
    .withMessage('Invalid flat ID format')
];

const validateCreateFlat = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  body('flatNumber')
    .notEmpty()
    .withMessage('Flat number is required')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Flat number must be between 1 and 20 characters'),
  
  body('relation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relation cannot exceed 50 characters'),
  
  body('age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be between 0 and 150'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage('Phone number cannot exceed 15 characters')
];

// Routes

// POST /api/flats/:buildingId - Create a new flat
router.post('/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  validateCreateFlat,
  createFlat
);

// GET /api/flats/:buildingId - Get all flats for a resident
router.get('/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  getFlats
);

// DELETE /api/flats/:buildingId/:flatId - Delete a flat
router.delete('/:buildingId/:flatId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  validateFlatId,
  deleteFlat
);

module.exports = router;
