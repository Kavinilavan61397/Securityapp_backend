const express = require('express');
const { body, param, query } = require('express-validator');
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { buildingAccess } = require('../middleware/auth');

const router = express.Router();

/**
 * Vehicle Routes
 * All routes require authentication and proper role authorization
 */

// Validation middleware
const validateVehicleCreation = [
  body('vehicleNumber')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Vehicle number must be between 3 and 20 characters')
    .matches(/^[A-Z0-9\s-]+$/)
    .withMessage('Vehicle number must contain only letters, numbers, spaces, or hyphens'),
  
  body('vehicleType')
    .isIn(['CAR', 'BIKE', 'SCOOTER', 'MOTORCYCLE', 'BICYCLE', 'AUTO_RICKSHAW', 'COMMERCIAL', 'OTHER'])
    .withMessage('Vehicle type must be one of: CAR, BIKE, SCOOTER, MOTORCYCLE, BICYCLE, AUTO_RICKSHAW, COMMERCIAL, OTHER'),
  
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand name cannot exceed 50 characters'),
  
  body('model')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Model name cannot exceed 50 characters'),
  
  body('color')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Color cannot exceed 30 characters'),
  
  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be between 1900 and next year'),
  
  body('engineNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Engine number cannot exceed 50 characters'),
  
  body('chassisNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Chassis number cannot exceed 50 characters'),
  
  body('registrationDate')
    .optional()
    .isISO8601()
    .withMessage('Registration date must be a valid date'),
  
  body('insuranceExpiry')
    .optional()
    .isISO8601()
    .withMessage('Insurance expiry date must be a valid date'),
  
  body('permitExpiry')
    .optional()
    .isISO8601()
    .withMessage('Permit expiry date must be a valid date'),
  
  body('parkingSlot')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Parking slot cannot exceed 20 characters'),
  
  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array'),
  
  body('documents.*.type')
    .optional()
    .isIn(['RC', 'INSURANCE', 'PERMIT', 'PUC', 'OTHER'])
    .withMessage('Document type must be one of: RC, INSURANCE, PERMIT, PUC, OTHER'),
  
  body('documents.*.documentNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Document number cannot exceed 50 characters'),
  
  body('documents.*.documentUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Document URL must be a valid URL'),
  
  body('documents.*.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Document expiry date must be a valid date'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateVehicleUpdate = [
  body('vehicleNumber')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Vehicle number must be between 3 and 20 characters')
    .matches(/^[A-Z0-9\s-]+$/)
    .withMessage('Vehicle number must contain only letters, numbers, spaces, or hyphens'),
  
  body('vehicleType')
    .optional()
    .isIn(['CAR', 'BIKE', 'SCOOTER', 'MOTORCYCLE', 'BICYCLE', 'AUTO_RICKSHAW', 'COMMERCIAL', 'OTHER'])
    .withMessage('Vehicle type must be one of: CAR, BIKE, SCOOTER, MOTORCYCLE, BICYCLE, AUTO_RICKSHAW, COMMERCIAL, OTHER'),
  
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand name cannot exceed 50 characters'),
  
  body('model')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Model name cannot exceed 50 characters'),
  
  body('color')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Color cannot exceed 30 characters'),
  
  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be between 1900 and next year'),
  
  body('engineNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Engine number cannot exceed 50 characters'),
  
  body('chassisNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Chassis number cannot exceed 50 characters'),
  
  body('registrationDate')
    .optional()
    .isISO8601()
    .withMessage('Registration date must be a valid date'),
  
  body('insuranceExpiry')
    .optional()
    .isISO8601()
    .withMessage('Insurance expiry date must be a valid date'),
  
  body('permitExpiry')
    .optional()
    .isISO8601()
    .withMessage('Permit expiry date must be a valid date'),
  
  body('parkingSlot')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Parking slot cannot exceed 20 characters'),
  
  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array'),
  
  body('documents.*.type')
    .optional()
    .isIn(['RC', 'INSURANCE', 'PERMIT', 'PUC', 'OTHER'])
    .withMessage('Document type must be one of: RC, INSURANCE, PERMIT, PUC, OTHER'),
  
  body('documents.*.documentNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Document number cannot exceed 50 characters'),
  
  body('documents.*.documentUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Document URL must be a valid URL'),
  
  body('documents.*.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Document expiry date must be a valid date'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateRouteParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID format'),
  
  param('vehicleId')
    .isMongoId()
    .withMessage('Invalid vehicle ID format')
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
  
  query('vehicleType')
    .optional()
    .isIn(['CAR', 'BIKE', 'SCOOTER', 'MOTORCYCLE', 'BICYCLE', 'AUTO_RICKSHAW', 'COMMERCIAL', 'OTHER'])
    .withMessage('Invalid vehicle type'),
  
  query('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
];

const validateVerification = [
  body('isVerified')
    .isBoolean()
    .withMessage('isVerified must be a boolean'),
  
  body('verificationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Verification notes cannot exceed 500 characters')
];

// Routes

/**
 * @route   POST /api/vehicles/:buildingId
 * @desc    Add new vehicle
 * @access  Private (Resident only)
 */
router.post('/:buildingId',
  validateRouteParams,
  validateVehicleCreation,
  buildingAccess,
  authorizeRoles(['RESIDENT']),
  vehicleController.addVehicle
);

/**
 * @route   GET /api/vehicles/:buildingId
 * @desc    Get all vehicles for building
 * @access  Private (Resident: own vehicles, Admin/Security: all building vehicles)
 */
router.get('/:buildingId',
  validateRouteParams,
  validateQueryParams,
  buildingAccess,
  authorizeRoles(['RESIDENT', 'BUILDING_ADMIN', 'SECURITY', 'SUPER_ADMIN']),
  vehicleController.getVehicles
);

/**
 * @route   GET /api/vehicles/:buildingId/:vehicleId
 * @desc    Get single vehicle
 * @access  Private (Resident: own vehicles, Admin/Security: all building vehicles)
 */
router.get('/:buildingId/:vehicleId',
  validateRouteParams,
  buildingAccess,
  authorizeRoles(['RESIDENT', 'BUILDING_ADMIN', 'SECURITY', 'SUPER_ADMIN']),
  vehicleController.getVehicle
);

/**
 * @route   PUT /api/vehicles/:buildingId/:vehicleId
 * @desc    Update vehicle
 * @access  Private (Owner only)
 */
router.put('/:buildingId/:vehicleId',
  validateRouteParams,
  validateVehicleUpdate,
  buildingAccess,
  authorizeRoles(['RESIDENT']),
  vehicleController.updateVehicle
);

/**
 * @route   DELETE /api/vehicles/:buildingId/:vehicleId
 * @desc    Delete vehicle (soft delete)
 * @access  Private (Owner only)
 */
router.delete('/:buildingId/:vehicleId',
  validateRouteParams,
  buildingAccess,
  authorizeRoles(['RESIDENT']),
  vehicleController.deleteVehicle
);

/**
 * @route   PUT /api/vehicles/:buildingId/:vehicleId/verify
 * @desc    Verify vehicle (Admin only)
 * @access  Private (Building Admin, Super Admin only)
 */
router.put('/:buildingId/:vehicleId/verify',
  validateRouteParams,
  validateVerification,
  buildingAccess,
  authorizeRoles(['BUILDING_ADMIN', 'SUPER_ADMIN']),
  vehicleController.verifyVehicle
);

/**
 * @route   GET /api/vehicles/:buildingId/stats
 * @desc    Get vehicle statistics for building
 * @access  Private (Building Admin, Super Admin only)
 */
router.get('/:buildingId/stats',
  validateRouteParams,
  buildingAccess,
  authorizeRoles(['BUILDING_ADMIN', 'SUPER_ADMIN']),
  vehicleController.getVehicleStats
);

module.exports = router;
