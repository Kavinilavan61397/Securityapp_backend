const express = require('express');
const { body, param, query } = require('express-validator');
const VisitController = require('../controllers/visitController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Validation middleware
const validateParams = [
  param('buildingId').isMongoId().withMessage('Invalid building ID'),
  param('visitId').isMongoId().withMessage('Invalid visit ID')
];

const validateQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED']).withMessage('Invalid status'),
  query('visitType').optional().isIn(['PRE_APPROVED', 'WALK_IN', 'SCHEDULED']).withMessage('Invalid visit type'),
  query('approvalStatus').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).withMessage('Invalid approval status'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('hostId').optional().isMongoId().withMessage('Invalid host ID'),
  query('visitorId').optional().isMongoId().withMessage('Invalid visitor ID')
];

const validateVisitCreation = [
  body('visitorId').isMongoId().withMessage('Invalid visitor ID'),
  body('hostId').isMongoId().withMessage('Invalid host ID'),
  body('hostFlatNumber').notEmpty().withMessage('Host flat number is required'),
  body('purpose').notEmpty().trim().isLength({ min: 5, max: 200 }).withMessage('Purpose must be between 5 and 200 characters'),
  body('visitType').optional().isIn(['PRE_APPROVED', 'WALK_IN', 'SCHEDULED']).withMessage('Invalid visit type'),
  body('scheduledDate').optional().isISO8601().withMessage('Invalid scheduled date format'),
  body('scheduledTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  body('expectedDuration').optional().isInt({ min: 15, max: 1440 }).withMessage('Expected duration must be between 15 and 1440 minutes'),
  body('vehicleNumber').optional().trim().isLength({ max: 20 }).withMessage('Vehicle number cannot exceed 20 characters'),
  body('vehicleType').optional().isIn(['CAR', 'BIKE', 'SCOOTER', 'AUTO', 'OTHER']).withMessage('Invalid vehicle type')
];

const validateVisitUpdate = [
  body('approvalStatus').optional().isIn(['APPROVED', 'REJECTED', 'CANCELLED']).withMessage('Invalid approval status'),
  body('rejectionReason').optional().trim().isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters'),
  body('securityNotes').optional().trim().isLength({ max: 1000 }).withMessage('Security notes cannot exceed 1000 characters')
];

const validateCheckIn = [
  body('qrCode').notEmpty().withMessage('QR code is required'),
  body('entryPhotoId').optional().isMongoId().withMessage('Invalid entry photo ID'),
  body('securityNotes').optional().trim().isLength({ max: 1000 }).withMessage('Security notes cannot exceed 1000 characters')
];

const validateCheckOut = [
  body('exitPhotoId').optional().isMongoId().withMessage('Invalid exit photo ID'),
  body('securityNotes').optional().trim().isLength({ max: 1000 }).withMessage('Security notes cannot exceed 1000 characters')
];

// Routes
// Create visit
router.post('/:buildingId', 
  validateParams.slice(0, 1), // Only buildingId validation
  validateVisitCreation,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitController.createVisit
);

// Get all visits with filtering and pagination
router.get('/:buildingId',
  validateParams.slice(0, 1), // Only buildingId validation
  validateQuery,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  VisitController.getVisits
);

// Get visit statistics
router.get('/:buildingId/stats',
  validateParams.slice(0, 1), // Only buildingId validation
  validateQuery.slice(6, 8), // Only startDate and endDate validation
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  VisitController.getVisitStats
);

// Search visits
router.get('/:buildingId/search',
  validateParams.slice(0, 1), // Only buildingId validation
  validateQuery,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  VisitController.searchVisits
);

// Get visit by ID
router.get('/:buildingId/:visitId',
  validateParams,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitController.getVisitById
);

// Update visit (approve/reject/cancel)
router.put('/:buildingId/:visitId',
  validateParams,
  validateVisitUpdate,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  VisitController.updateVisit
);

// Check-in visitor
router.post('/:buildingId/:visitId/checkin',
  validateParams,
  validateCheckIn,
  buildingAccess,
  authorizeRoles(['SECURITY']),
  VisitController.checkIn
);

// Check-out visitor
router.post('/:buildingId/:visitId/checkout',
  validateParams,
  validateCheckOut,
  buildingAccess,
  authorizeRoles(['SECURITY']),
  VisitController.checkOut
);

/**
 * @route   POST /api/visits/:buildingId/scan-qr
 * @desc    Scan QR code and get visitor details
 * @access  Private (Security only)
 */
router.post('/:buildingId/scan-qr',
  validateParams[0],
  buildingAccess,
  authorizeRoles(['SECURITY']),
  VisitController.scanQRCode
);

/**
 * @route   GET /api/visits/:buildingId/:visitId/qr-code
 * @desc    Get QR code for a visit
 * @access  Private (Security, Building Admin, Super Admin)
 */
router.get('/:buildingId/:visitId/qr-code',
  validateParams,
  buildingAccess,
  authorizeRoles(['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  VisitController.getQRCode
);

module.exports = router;
