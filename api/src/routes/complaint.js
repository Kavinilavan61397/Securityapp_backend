const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const ComplaintController = require('../controllers/complaintController_simple');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validateComplaint = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Complaint message is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Complaint message must be between 10 and 1000 characters')
];

const validateComplaintUpdate = [
  body('status')
    .optional()
    .isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
    .withMessage('Invalid status value'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Invalid priority value'),
  body('response')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Response cannot exceed 1000 characters')
];

// Public routes (authenticated users only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateComplaint,
  ComplaintController.createComplaint
);

router.get(
  '/my-complaints',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN']),
  ComplaintController.getMyComplaints
);

// Admin/Security routes
router.get(
  '/all',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  ComplaintController.getAllComplaints
);

router.get(
  '/stats',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  ComplaintController.getComplaintStats
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  validateComplaintUpdate,
  ComplaintController.updateComplaint
);

module.exports = router;
