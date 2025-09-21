const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken, requireVerification, authorizeRoles } = require('../middleware/auth');

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
  
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phoneNumber')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .isIn(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT'])
    .withMessage('Invalid role specified'),
  
  body('buildingId')
    .if(body('role').isIn(['BUILDING_ADMIN', 'SECURITY']))
    .isMongoId()
    .withMessage('Building ID is required and must be valid'),
  
  body('employeeCode')
    .if(body('role').isIn(['BUILDING_ADMIN', 'SECURITY']))
    .notEmpty()
    .withMessage('Employee code is required for this role'),
  
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters'),
  
  body('tenantType')
    .optional()
    .isIn(['OWNER', 'TENANT'])
    .withMessage('Tenant type must be either OWNER or TENANT'),
  
  body('dateOfBirth')
    .optional()
    .custom((value) => {
      // Accept multiple date formats: dd/mm/yyyy, yyyy-mm-dd, ISO8601
      const formats = [
        /^\d{2}\/\d{2}\/\d{4}$/, // dd/mm/yyyy
        /^\d{4}-\d{2}-\d{2}$/,   // yyyy-mm-dd
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ // ISO8601
      ];
      
      const isValidFormat = formats.some(format => format.test(value));
      if (!isValidFormat) {
        throw new Error('Date of birth must be in dd/mm/yyyy, yyyy-mm-dd, or ISO8601 format');
      }
      
      // Check if it's a valid date
      let date;
      if (value.includes('/')) {
        // Handle dd/mm/yyyy format
        const [day, month, year] = value.split('/');
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(value);
      }
      
      if (isNaN(date.getTime())) {
        throw new Error('Date of birth must be a valid date');
      }
      
      if (date >= new Date()) {
        throw new Error('Date of birth must be in the past');
      }
      
      return true;
    }),
  
  body('age')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Age must be between 1 and 120'),
  
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Gender must be MALE, FEMALE, or OTHER'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  
  body('completeAddress')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Complete address cannot exceed 500 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  
  body('pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits')
];

const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const otpValidation = [
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId'),
  
  body('otp')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('OTP must be a 4-digit number')
];

const resendOTPValidation = [
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId')
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
    .withMessage('Profile picture must be a valid URL'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  
  body('completeAddress')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Complete address cannot exceed 500 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  
  body('pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits')
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
 * @route   POST /api/auth/resident-login
 * @desc    Resident login (Figma design flow)
 * @access  Public
 */
const residentLoginValidation = [
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
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters')
];

router.post('/resident-login', residentLoginValidation, authController.residentLogin);

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
 * @route   GET /api/auth/users
 * @desc    Get all users (with role-based access)
 * @access  Private (Authenticated users only)
 */
router.get('/users', 
  authenticateToken, 
  requireVerification(),
  authController.getAllUsers
);

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

/**
 * @route   POST /api/auth/test-email
 * @desc    Test email service (Development only)
 * @access  Public
 */
router.post('/test-email', authController.testEmailService);

/**
 * @route   PUT /api/admin/users/:userId/verify
 * @desc    Admin user verification (Additive feature)
 * @access  Private (Admin only)
 */
router.put('/admin/users/:userId/verify', 
  authenticateToken, 
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  [
    body('verificationLevel')
      .isIn(['VERIFIED', 'REJECTED'])
      .withMessage('verificationLevel must be VERIFIED or REJECTED'),
    body('verificationNotes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Verification notes cannot exceed 500 characters')
  ],
  authController.verifyUser
);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account (own account)
 * @access  Private (Authenticated users only)
 */
router.delete('/account', 
  authenticateToken, 
  requireVerification(),
  authController.deleteAccount
);

/**
 * @route   DELETE /api/auth/admin/users/:userId
 * @desc    Admin delete user account
 * @access  Private (Admin only)
 */
router.delete('/admin/users/:userId', 
  authenticateToken, 
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  authController.deleteAccount
);

module.exports = router;
