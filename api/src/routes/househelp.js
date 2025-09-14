const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createHousehelp, getHousehelp, deleteHousehelp } = require('../controllers/househelpController');

const router = express.Router();

// Validation middleware
const validateBuildingId = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format')
];

const validateHousehelpId = [
  param('househelpId')
    .isMongoId()
    .withMessage('Invalid househelp ID format')
];

const validateCreateHousehelp = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Occupation cannot exceed 100 characters'),
  
  body('visitingTime')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Visiting time cannot exceed 200 characters')
];

// Routes

// POST /api/househelp/:buildingId - Create a new househelp
router.post('/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  validateCreateHousehelp,
  createHousehelp
);

// GET /api/househelp/:buildingId - Get all househelp for a resident
router.get('/:buildingId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  getHousehelp
);

// DELETE /api/househelp/:buildingId/:househelpId - Delete a househelp
router.delete('/:buildingId/:househelpId',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateBuildingId,
  validateHousehelpId,
  deleteHousehelp
);

module.exports = router;
