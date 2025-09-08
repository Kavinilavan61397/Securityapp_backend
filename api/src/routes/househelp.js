const express = require('express');
const { body, param, query } = require('express-validator');
const househelpController = require('../controllers/househelpController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const validateHousehelpCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phoneNumber')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  body('househelpType')
    .isIn(['MAID', 'COOK', 'DRIVER', 'GUARD', 'GARDENER', 'CLEANER', 'NANNY', 'OTHER'])
    .withMessage('Househelp type must be one of: MAID, COOK, DRIVER, GUARD, GARDENER, CLEANER, NANNY, OTHER'),
  body('alternatePhoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid alternate phone number'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  body('pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
  body('idType')
    .optional()
    .isIn(['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'])
    .withMessage('Invalid ID type'),
  body('idNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('ID number cannot exceed 50 characters'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  body('emergencyContact.phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid emergency contact phone number'),
  body('emergencyContact.relation')
    .optional()
    .isIn(['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'FRIEND', 'OTHER'])
    .withMessage('Invalid emergency contact relation'),
  body('workSchedule.startTime')
    .optional()
    .matches(/^\d{1,2}:\d{2}\s?(am|pm)$/i)
    .withMessage('Start time must be in hh:mm am/pm format'),
  body('workSchedule.endTime')
    .optional()
    .matches(/^\d{1,2}:\d{2}\s?(am|pm)$/i)
    .withMessage('End time must be in hh:mm am/pm format'),
  body('workSchedule.workingDays')
    .optional()
    .isArray()
    .withMessage('Working days must be an array'),
  body('workSchedule.workingDays.*')
    .optional()
    .isIn(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
    .withMessage('Invalid working day'),
  body('workSchedule.isFullTime')
    .optional()
    .isBoolean()
    .withMessage('isFullTime must be a boolean value'),
  body('salary.amount')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Salary amount must be a positive number'),
  body('salary.frequency')
    .optional()
    .isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
    .withMessage('Salary frequency must be one of: DAILY, WEEKLY, MONTHLY, YEARLY'),
  body('salary.currency')
    .optional()
    .isLength({ max: 3 })
    .withMessage('Currency code cannot exceed 3 characters'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('skills.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each skill cannot exceed 50 characters'),
  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),
  body('languages.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each language cannot exceed 50 characters'),
  body('experience.years')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Experience years must be a non-negative integer'),
  body('experience.months')
    .optional()
    .isInt({ min: 0, max: 11 })
    .withMessage('Experience months must be between 0 and 11'),
  body('experience.previousEmployers')
    .optional()
    .isArray()
    .withMessage('Previous employers must be an array'),
  body('experience.previousEmployers.*.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Previous employer name cannot exceed 100 characters'),
  body('experience.previousEmployers.*.duration')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Duration cannot exceed 50 characters'),
  body('experience.previousEmployers.*.reference')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reference cannot exceed 200 characters'),
  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array'),
  body('documents.*.type')
    .optional()
    .isIn(['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'POLICE_VERIFICATION', 'MEDICAL_CERTIFICATE', 'OTHER'])
    .withMessage('Invalid document type'),
  body('documents.*.number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Document number cannot exceed 50 characters'),
  body('documents.*.issuedBy')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Issued by cannot exceed 100 characters'),
  body('documents.*.issuedDate')
    .optional()
    .isISO8601()
    .withMessage('Issued date must be a valid ISO 8601 date'),
  body('documents.*.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date'),
  body('documents.*.filePath')
    .optional()
    .isString()
    .withMessage('File path must be a string'),
  body('documents.*.isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean value'),
  body('backgroundCheck.isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be a boolean value'),
  body('backgroundCheck.completedDate')
    .optional()
    .isISO8601()
    .withMessage('Completed date must be a valid ISO 8601 date'),
  body('backgroundCheck.status')
    .optional()
    .isIn(['PENDING', 'CLEAR', 'ISSUES_FOUND', 'REJECTED'])
    .withMessage('Background check status must be one of: PENDING, CLEAR, ISSUES_FOUND, REJECTED'),
  body('backgroundCheck.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Background check notes cannot exceed 500 characters'),
  body('healthStatus.isHealthy')
    .optional()
    .isBoolean()
    .withMessage('isHealthy must be a boolean value'),
  body('healthStatus.medicalCertificate')
    .optional()
    .isString()
    .withMessage('Medical certificate must be a string'),
  body('healthStatus.lastCheckup')
    .optional()
    .isISO8601()
    .withMessage('Last checkup must be a valid ISO 8601 date'),
  body('healthStatus.nextCheckup')
    .optional()
    .isISO8601()
    .withMessage('Next checkup must be a valid ISO 8601 date'),
  body('healthStatus.allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array'),
  body('healthStatus.allergies.*')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Each allergy cannot exceed 100 characters'),
  body('healthStatus.medications')
    .optional()
    .isArray()
    .withMessage('Medications must be an array'),
  body('healthStatus.medications.*')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Each medication cannot exceed 100 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

const validateHousehelpUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  body('househelpType')
    .optional()
    .isIn(['MAID', 'COOK', 'DRIVER', 'GUARD', 'GARDENER', 'CLEANER', 'NANNY', 'OTHER'])
    .withMessage('Househelp type must be one of: MAID, COOK, DRIVER, GUARD, GARDENER, CLEANER, NANNY, OTHER'),
  body('alternatePhoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid alternate phone number'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  body('pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
  body('idType')
    .optional()
    .isIn(['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'])
    .withMessage('Invalid ID type'),
  body('idNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('ID number cannot exceed 50 characters'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name cannot exceed 100 characters'),
  body('emergencyContact.phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid emergency contact phone number'),
  body('emergencyContact.relation')
    .optional()
    .isIn(['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'FRIEND', 'OTHER'])
    .withMessage('Invalid emergency contact relation'),
  body('workSchedule.startTime')
    .optional()
    .matches(/^\d{1,2}:\d{2}\s?(am|pm)$/i)
    .withMessage('Start time must be in hh:mm am/pm format'),
  body('workSchedule.endTime')
    .optional()
    .matches(/^\d{1,2}:\d{2}\s?(am|pm)$/i)
    .withMessage('End time must be in hh:mm am/pm format'),
  body('workSchedule.workingDays')
    .optional()
    .isArray()
    .withMessage('Working days must be an array'),
  body('workSchedule.workingDays.*')
    .optional()
    .isIn(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
    .withMessage('Invalid working day'),
  body('workSchedule.isFullTime')
    .optional()
    .isBoolean()
    .withMessage('isFullTime must be a boolean value'),
  body('salary.amount')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Salary amount must be a positive number'),
  body('salary.frequency')
    .optional()
    .isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
    .withMessage('Salary frequency must be one of: DAILY, WEEKLY, MONTHLY, YEARLY'),
  body('salary.currency')
    .optional()
    .isLength({ max: 3 })
    .withMessage('Currency code cannot exceed 3 characters'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('skills.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each skill cannot exceed 50 characters'),
  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),
  body('languages.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each language cannot exceed 50 characters'),
  body('experience.years')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Experience years must be a non-negative integer'),
  body('experience.months')
    .optional()
    .isInt({ min: 0, max: 11 })
    .withMessage('Experience months must be between 0 and 11'),
  body('experience.previousEmployers')
    .optional()
    .isArray()
    .withMessage('Previous employers must be an array'),
  body('experience.previousEmployers.*.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Previous employer name cannot exceed 100 characters'),
  body('experience.previousEmployers.*.duration')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Duration cannot exceed 50 characters'),
  body('experience.previousEmployers.*.reference')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reference cannot exceed 200 characters'),
  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array'),
  body('documents.*.type')
    .optional()
    .isIn(['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'POLICE_VERIFICATION', 'MEDICAL_CERTIFICATE', 'OTHER'])
    .withMessage('Invalid document type'),
  body('documents.*.number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Document number cannot exceed 50 characters'),
  body('documents.*.issuedBy')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Issued by cannot exceed 100 characters'),
  body('documents.*.issuedDate')
    .optional()
    .isISO8601()
    .withMessage('Issued date must be a valid ISO 8601 date'),
  body('documents.*.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date'),
  body('documents.*.filePath')
    .optional()
    .isString()
    .withMessage('File path must be a string'),
  body('documents.*.isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean value'),
  body('backgroundCheck.isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be a boolean value'),
  body('backgroundCheck.completedDate')
    .optional()
    .isISO8601()
    .withMessage('Completed date must be a valid ISO 8601 date'),
  body('backgroundCheck.status')
    .optional()
    .isIn(['PENDING', 'CLEAR', 'ISSUES_FOUND', 'REJECTED'])
    .withMessage('Background check status must be one of: PENDING, CLEAR, ISSUES_FOUND, REJECTED'),
  body('backgroundCheck.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Background check notes cannot exceed 500 characters'),
  body('healthStatus.isHealthy')
    .optional()
    .isBoolean()
    .withMessage('isHealthy must be a boolean value'),
  body('healthStatus.medicalCertificate')
    .optional()
    .isString()
    .withMessage('Medical certificate must be a string'),
  body('healthStatus.lastCheckup')
    .optional()
    .isISO8601()
    .withMessage('Last checkup must be a valid ISO 8601 date'),
  body('healthStatus.nextCheckup')
    .optional()
    .isISO8601()
    .withMessage('Next checkup must be a valid ISO 8601 date'),
  body('healthStatus.allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array'),
  body('healthStatus.allergies.*')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Each allergy cannot exceed 100 characters'),
  body('healthStatus.medications')
    .optional()
    .isArray()
    .withMessage('Medications must be an array'),
  body('healthStatus.medications.*')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Each medication cannot exceed 100 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

const validateVerification = [
  body('verificationLevel')
    .isIn(['VERIFIED', 'REJECTED'])
    .withMessage('verificationLevel must be VERIFIED or REJECTED'),
  body('verificationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Verification notes cannot exceed 500 characters')
];

const validateWorkHistory = [
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  body('workType')
    .isIn(['MAID', 'COOK', 'DRIVER', 'GUARD', 'GARDENER', 'CLEANER', 'NANNY', 'OTHER'])
    .withMessage('Work type must be one of: MAID, COOK, DRIVER, GUARD, GARDENER, CLEANER, NANNY, OTHER'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Work description cannot exceed 500 characters'),
  body('performance')
    .optional()
    .isIn(['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR'])
    .withMessage('Performance must be one of: EXCELLENT, GOOD, AVERAGE, POOR'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateEndWork = [
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const validateRouteParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Invalid building ID'),
  param('househelpId')
    .isMongoId()
    .withMessage('Invalid househelp ID')
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
  query('househelpType')
    .optional()
    .isIn(['MAID', 'COOK', 'DRIVER', 'GUARD', 'GARDENER', 'CLEANER', 'NANNY', 'OTHER'])
    .withMessage('Invalid househelp type'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  query('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean value'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'updatedAt', 'househelpType', 'isActive', 'isVerified'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Routes

// Create househelp
router.post('/:buildingId',
  authenticateToken,
  buildingAccess,
  validateHousehelpCreation,
  househelpController.createHousehelp
);

// Get all househelp for a building
router.get('/:buildingId',
  authenticateToken,
  buildingAccess,
  validateQueryParams,
  househelpController.getHousehelp
);

// Get single househelp
router.get('/:buildingId/:househelpId',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  househelpController.getSingleHousehelp
);

// Update househelp
router.put('/:buildingId/:househelpId',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  validateHousehelpUpdate,
  househelpController.updateHousehelp
);

// Delete househelp
router.delete('/:buildingId/:househelpId',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  househelpController.deleteHousehelp
);

// Verify househelp
router.put('/:buildingId/:househelpId/verify',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  validateVerification,
  househelpController.verifyHousehelp
);

// Add work history
router.post('/:buildingId/:househelpId/work-history',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  validateWorkHistory,
  househelpController.addWorkHistory
);

// End current work
router.put('/:buildingId/:househelpId/end-work',
  authenticateToken,
  buildingAccess,
  validateRouteParams,
  validateEndWork,
  househelpController.endCurrentWork
);

// Get househelp statistics
router.get('/:buildingId/stats',
  authenticateToken,
  buildingAccess,
  househelpController.getHousehelpStats
);

module.exports = router;
