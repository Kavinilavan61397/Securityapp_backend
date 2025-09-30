const express = require('express');
const { body, param, query } = require('express-validator');
const BuildingController = require('../controllers/buildingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * Building Routes
 * All routes require authentication and proper role authorization
 */

// Validation middleware
const validateBuildingCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Building name must be between 2 and 100 characters'),
  
  body('address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  
  body('address.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  
  body('address.pincode')
    .trim()
    .isLength({ min: 6, max: 10 })
    .withMessage('Pincode must be between 6 and 10 characters'),
  
  body('totalFloors')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Total floors must be between 1 and 200'),
  
  body('totalFlats')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Total flats must be between 1 and 10000'),
  
  body('contactPhone')
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Contact phone must be a valid international phone number'),
  
  body('contactEmail')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Contact email must be a valid email address'),
  
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),
  
  body('operatingHours.open')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Opening time must be in HH:MM format'),
  
  body('operatingHours.close')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Closing time must be in HH:MM format'),
  
  body('securitySettings.visitorCheckIn')
    .optional()
    .isBoolean()
    .withMessage('Visitor check-in setting must be boolean'),
  
  body('securitySettings.visitorCheckOut')
    .optional()
    .isBoolean()
    .withMessage('Visitor check-out setting must be boolean'),
  
  body('securitySettings.photoCapture')
    .optional()
    .isBoolean()
    .withMessage('Photo capture setting must be boolean'),
  
  body('securitySettings.idVerification')
    .optional()
    .isBoolean()
    .withMessage('ID verification setting must be boolean'),
  
  body('securitySettings.notificationAlerts')
    .optional()
    .isBoolean()
    .withMessage('Notification alerts setting must be boolean')
];

const validateBuildingUpdate = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Building name must be between 2 and 100 characters'),
  
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  
  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('address.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  
  body('address.pincode')
    .optional()
    .trim()
    .isLength({ min: 6, max: 10 })
    .withMessage('Pincode must be between 6 and 10 characters'),
  
  body('totalFloors')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Total floors must be between 1 and 200'),
  
  body('totalFlats')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Total flats must be between 1 and 10000'),
  
  body('contactPhone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Contact phone must be a valid international phone number'),
  
  body('contactEmail')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Contact email must be a valid email address')
];

const validateBuildingId = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format')
];

const validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  query('pincode')
    .optional()
    .trim()
    .isLength({ min: 6, max: 10 })
    .withMessage('Pincode must be between 6 and 10 characters'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either "active" or "inactive"'),
  
  query('query')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('features')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Features filter must be between 1 and 200 characters')
];

// Route: Create Building
// POST /api/buildings
// Only SUPER_ADMIN can create buildings
router.post('/',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN']),
  validateBuildingCreation,
  BuildingController.createBuilding
);

// Route: Get All Buildings
// GET /api/buildings
// SUPER_ADMIN: All buildings, BUILDING_ADMIN: Only their building
router.get('/',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateQueryParams,
  BuildingController.getBuildings
);

// Route: Get Public Buildings List (for registration dropdown)
// GET /api/buildings/public
// No authentication required - for registration dropdown
router.get('/public',
  BuildingController.getPublicBuildings
);

// Route: Search Buildings
// GET /api/buildings/search
// SUPER_ADMIN: All buildings, BUILDING_ADMIN: Only their building
router.get('/search',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateQueryParams,
  BuildingController.searchBuildings
);

// Route: Get Building by ID
// GET /api/buildings/:buildingId
// Access control based on user role
router.get('/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  validateBuildingId,
  BuildingController.getBuildingById
);

// Route: Update Building
// PUT /api/buildings/:buildingId
// SUPER_ADMIN and assigned BUILDING_ADMIN can update
router.put('/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateBuildingUpdate,
  BuildingController.updateBuilding
);

// Route: Delete Building (Soft Delete)
// DELETE /api/buildings/:buildingId
// Only SUPER_ADMIN can delete buildings
router.delete('/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN']),
  validateBuildingId,
  BuildingController.deleteBuilding
);


// Route: Get Building Statistics
// GET /api/buildings/:buildingId/stats
// Access control based on user role
router.get('/:buildingId/stats',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'RESIDENT']),
  validateBuildingId,
  BuildingController.getBuildingStats
);

module.exports = router;
