const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken, requireVerification } = require('../middleware/auth');

const router = express.Router();

/**
 * Authentication Routes
 * All routes are 100% dynamic with proper validation
 */

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phoneNumber')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('role')
    .isIn(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT'])
    .withMessage('Invalid role specified'),
  
  body('buildingId')
    .if(body('role').isIn(['BUILDING_ADMIN', 'SECURITY', 'RESIDENT']))
    .isMongoId()
    .withMessage('Building ID is required and must be valid'),
  
  body('employeeCode')
    .if(body('role').isIn(['BUILDING_ADMIN', 'SECURITY']))
    .notEmpty()
    .withMessage('Employee code is required for this role'),
  
  body('flatNumber')
    .if(body('role').equals('RESIDENT'))
    .notEmpty()
    .withMessage('Flat number is required for residents'),
  
  body('tenantType')
    .if(body('role').equals('RESIDENT'))
    .isIn(['OWNER', 'TENANT'])
    .withMessage('Tenant type must be either OWNER or TENANT'),
  
  body('age')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be between 1 and 120'),
  
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER')
];

const loginValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('role')
    .optional()
    .isIn(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT'])
    .withMessage('Invalid role specified')
];

const otpValidation = [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  
  body('otp')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('OTP must be a 4-digit number')
];

const resendOTPValidation = [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required')
];

const profileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('age')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be between 1 and 120'),
  
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  
  body('profilePicture')
    .optional()
    .isURL()
    .withMessage('Profile picture must be a valid URL')
];

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', registerValidation, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    User login (generates OTP)
 * @access  Public
 */
router.post('/login', loginValidation, authController.login);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and complete login
 * @access  Public
 */
router.post('/verify-otp', otpValidation, authController.verifyOTP);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
router.post('/resend-otp', resendOTPValidation, authController.resendOTP);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private (Authenticated users only)
 */
router.get('/profile', authenticateToken, requireVerification(), authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private (Authenticated users only)
 */
router.put('/profile', authenticateToken, requireVerification(), profileUpdateValidation, authController.updateProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Private (Authenticated users only)
 */
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
