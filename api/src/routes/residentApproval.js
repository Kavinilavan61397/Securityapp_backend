const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const ResidentApprovalController = require('../controllers/residentApprovalController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validateCreateResidentApproval = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address'),
  
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  
  body('age')
    .notEmpty()
    .withMessage('Age is required')
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be between 1 and 120'),
  
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be one of: MALE, FEMALE, OTHER'),
  
  body('flatNumber')
    .trim()
    .notEmpty()
    .withMessage('Flat number is required')
    .isLength({ min: 1, max: 20 })
    .withMessage('Flat number must be between 1 and 20 characters'),
  
  body('tenantType')
    .notEmpty()
    .withMessage('Tenant type is required')
    .isIn(['OWNER', 'TENANT'])
    .withMessage('Tenant type must be one of: OWNER, TENANT'),
  
  body('idProof.type')
    .optional()
    .isIn(['AADHAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'OTHER'])
    .withMessage('Invalid ID proof type'),
  
  body('idProof.number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('ID proof number cannot exceed 50 characters'),
  
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),
  
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  
  body('address.pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
  
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  
  body('emergencyContact.phone')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid emergency contact phone number'),
  
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relationship cannot exceed 50 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

const validateApproveResident = [
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin notes cannot exceed 1000 characters')
];

const validateDenyResident = [
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason cannot exceed 500 characters'),
  
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin notes cannot exceed 1000 characters')
];

const validateParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID'),
  
  param('approvalId')
    .isMongoId()
    .withMessage('Invalid approval ID')
];

const validateQuery = [
  query('status')
    .optional()
    .isIn(['PENDING', 'APPROVED', 'DENIED'])
    .withMessage('Invalid status value'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes

// Create resident approval request (Public endpoint)
router.post(
  '/:buildingId',
  validateParams[0], // buildingId validation
  validateCreateResidentApproval,
  ResidentApprovalController.createResidentApproval
);

// Get pending approvals count (MUST be before /:buildingId routes)
router.get(
  '/:buildingId/pending/count',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams[0], // buildingId validation
  ResidentApprovalController.getPendingCount
);

// Get approval statistics (MUST be before /:buildingId routes)
router.get(
  '/:buildingId/stats',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams[0], // buildingId validation
  ResidentApprovalController.getApprovalStats
);

// Get all resident approvals for a building (Admin only)
router.get(
  '/:buildingId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams[0], // buildingId validation
  validateQuery,
  ResidentApprovalController.getResidentApprovals
);

// Get single resident approval (Admin only)
router.get(
  '/:buildingId/:approvalId',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  validateParams,
  ResidentApprovalController.getResidentApprovalById
);

// Approve resident (Admin/Security)
router.post(
  '/:buildingId/:approvalId/approve',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  validateParams,
  validateApproveResident,
  ResidentApprovalController.approveResident
);

// Deny resident (Admin/Security)
router.post(
  '/:buildingId/:approvalId/deny',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  validateParams,
  validateDenyResident,
  ResidentApprovalController.denyResident
);


module.exports = router;
