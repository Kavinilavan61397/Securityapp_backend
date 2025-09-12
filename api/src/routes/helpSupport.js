const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const HelpSupportController = require('../controllers/helpSupportController_simple');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Validation middleware
const validateSupportTicket = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Support message is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Support message must be between 10 and 1000 characters'),
  body('category')
    .optional()
    .isIn(['GENERAL', 'TECHNICAL', 'ACCOUNT', 'EMERGENCY', 'OTHER'])
    .withMessage('Invalid category value')
];

const validateSupportTicketUpdate = [
  body('status')
    .optional()
    .isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
    .withMessage('Invalid status value'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority value'),
  body('response')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Response cannot exceed 1000 characters')
];

// Public routes (authenticated users only)
router.post(
  '/tickets',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  validateSupportTicket,
  HelpSupportController.createSupportTicket
);

router.get(
  '/my-tickets',
  authenticateToken,
  authorizeRoles(['RESIDENT']),
  HelpSupportController.getMySupportTickets
);

router.get(
  '/emergency-contacts',
  authenticateToken,
  authorizeRoles(['RESIDENT', 'SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  HelpSupportController.getEmergencyContacts
);

// Admin/Security routes
router.get(
  '/tickets/all',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  HelpSupportController.getAllSupportTickets
);

router.get(
  '/tickets/stats',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  HelpSupportController.getSupportTicketStats
);

router.put(
  '/tickets/:id',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  validateSupportTicketUpdate,
  HelpSupportController.updateSupportTicket
);

module.exports = router;
