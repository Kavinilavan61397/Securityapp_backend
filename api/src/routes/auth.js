const express = require('express');
const { body, param } = require('express-validator');
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
    .optional()
    .trim()
    .custom((value) => {
      if (value && value.length > 0) {
        if (value.length < 3 || value.length > 30) {
          throw new Error('Username must be between 3 and 30 characters');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }
      }
      return true;
    }),
  
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

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
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

  body('blockNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Block number cannot exceed 20 characters'),

  body('societyName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Society name cannot exceed 100 characters'),

  body('area')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Area cannot exceed 100 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  
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

  // OTP Verification fields
  body('phoneOTP')
    .optional()
    .isLength({ min: 4, max: 4 })
    .withMessage('Phone OTP must be exactly 4 digits'),

  body('emailOTP')
    .optional()
    .isLength({ min: 4, max: 4 })
    .withMessage('Email OTP must be exactly 4 digits'),
  
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
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
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

// Forgot Password Validation
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const verifyResetOTPValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('otp')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('OTP must be a 4-digit number')
];

const resetPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('resetToken')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
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

// User ID validation
const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
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
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (Step 1)
 * @access  Public
 */
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);

/**
 * @route   POST /api/auth/verify-reset-otp
 * @desc    Verify reset OTP (Step 2)
 * @access  Public
 */
router.post('/verify-reset-otp', verifyResetOTPValidation, authController.verifyResetOTP);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password (Step 3)
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);

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
 * @route   GET /api/auth/users/:userId
 * @desc    Get user by ID
 * @access  Private (Security, Building Admin, Super Admin)
 */
router.get('/users/:userId',
  authenticateToken,
  requireVerification(),
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  validateUserId,
  authController.getUserById
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

/**
 * 3-Step Registration Flow
 */

// Step 1: Personal Details + Password Confirmation
const step1Validation = [
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

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
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
  
  body('dateOfBirth')
    .optional()
    .custom((value) => {
      if (value) {
        const formats = [
          /^\d{2}\/\d{2}\/\d{4}$/, // dd/mm/yyyy
          /^\d{4}-\d{2}-\d{2}$/,   // yyyy-mm-dd
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ // ISO8601
        ];
        
        const isValidFormat = formats.some(format => format.test(value));
        if (!isValidFormat) {
          throw new Error('Date of birth must be in dd/mm/yyyy, yyyy-mm-dd, or ISO8601 format');
        }
        
        let date;
        if (value.includes('/')) {
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
    .withMessage('Gender must be MALE, FEMALE, or OTHER')
];

// Step 2: OTP Verification
const step2Validation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phoneOTP')
    .isLength({ min: 4, max: 4 })
    .withMessage('Phone OTP must be exactly 4 digits'),

  body('emailOTP')
    .isLength({ min: 4, max: 4 })
    .withMessage('Email OTP must be exactly 4 digits')
];

// Step 3: Address Details
const step3Validation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('flatNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters'),

  body('blockNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Block number cannot exceed 20 characters'),

  body('societyName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Society name cannot exceed 100 characters'),

  body('area')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Area cannot exceed 100 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  
  body('tenantType')
    .optional()
    .isIn(['OWNER', 'TENANT'])
    .withMessage('Tenant type must be either OWNER or TENANT')
];

/**
 * @route   POST /api/auth/register/step1
 * @desc    Step 1: Personal Details + Password Confirmation
 * @access  Public
 */
router.post('/register/step1', step1Validation, authController.registerStep1);

/**
 * @route   POST /api/auth/register/step2
 * @desc    Step 2: OTP Verification
 * @access  Public
 */
router.post('/register/step2', step2Validation, authController.registerStep2);

/**
 * @route   POST /api/auth/register/step3
 * @desc    Step 3: Address Details
 * @access  Public
 */
router.post('/register/step3', step3Validation, authController.registerStep3);

module.exports = router;
