const express = require('express');
const { body, param, query } = require('express-validator');
const VisitorController = require('../controllers/visitorController');
const { authenticateToken, authorizeRoles, buildingAccess } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const Photo = require('../models/Photo');

const router = express.Router();

// Configure multer for photo uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const buildingDir = path.join(uploadsDir, req.params.buildingId);
    if (!fs.existsSync(buildingDir)) {
      fs.mkdirSync(buildingDir, { recursive: true });
    }
    cb(null, buildingDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex') + '_' + Date.now();
    const filename = uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      console.log('File rejected - not an image:', file.mimetype);
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateVisitorCreation = [
  // Required fields only
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  
  // New Date and Time fields (optional)
  body('Date')
    .optional()
    .matches(/^\d{2}\/\d{2}\/\d{4}$/)
    .withMessage('Date must be in dd/mm/yyyy format'),
  
  body('Time')
    .optional()
    .matches(/^\d{1,2}:\d{2}\s?(am|pm)$/i)
    .withMessage('Time must be in hh:mm am/pm format'),
  
  // All other fields are now optional
  body('idType')
    .optional()
    .isIn(['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'])
    .withMessage('Invalid ID type'),
  
  body('idNumber')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('ID number must not be empty if provided'),
  
  body('purpose')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Purpose must be between 5 and 200 characters if provided'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  
  body('vehicleNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Vehicle number cannot exceed 20 characters'),
  
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
    .withMessage('Relationship cannot exceed 50 characters')
];

const validateVisitorUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  
  body('idType')
    .optional()
    .isIn(['AADHAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER'])
    .withMessage('Invalid ID type'),
  
  body('idNumber')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('ID number is required'),
  
  body('purpose')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Purpose must be between 5 and 200 characters'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  
  body('vehicleNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Vehicle number cannot exceed 20 characters'),
  
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
    .withMessage('Relationship cannot exceed 50 characters')
];

const validateParams = [
  param('buildingId')
    .isMongoId()
    .withMessage('Valid building ID is required'),
  
  param('visitorId')
    .optional()
    .isMongoId()
    .withMessage('Valid visitor ID is required')
];

const validateQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  
  query('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Blacklisted'])
    .withMessage('Invalid status value'),
  
  query('isBlacklisted')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isBlacklisted must be true or false'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'totalVisits', 'lastVisitAt'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('query')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
];

// Routes

// POST /api/visitors/:buildingId - Create a new visitor
router.post('/:buildingId',
  validateParams,
  validateVisitorCreation,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.createVisitor
);

// GET /api/visitors/:buildingId/stats - Get visitor statistics (MUST come before :buildingId route)
router.get('/:buildingId/stats',
  validateParams,
  validateQuery,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN']),
  VisitorController.getVisitorStats
);

// POST /api/visitors/:buildingId/:visitorId/upload-photo - Upload visitor verification photo
router.post('/:buildingId/:visitorId/upload-photo',
  validateParams,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      console.log('Photo upload request received:', {
        buildingId: req.params.buildingId,
        visitorId: req.params.visitorId,
        hasFile: !!req.file,
        fileInfo: req.file ? {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null
      });

      const { buildingId, visitorId } = req.params;
      
      if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({
          success: false,
          message: 'No photo file uploaded'
        });
      }

      // Create photo record
      const photo = await Photo.create({
        photoId: `PHOTO_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user.userId,
        buildingId,
        relatedType: 'VISITOR',
        relatedId: visitorId,
        description: 'Visitor verification photo',
        tags: ['visitor', 'verification'],
        isPublic: false
      });

      // Update visitor with photo reference
      const Visitor = require('../models/Visitor');
      await Visitor.findByIdAndUpdate(visitorId, { photo: photo._id });

      res.status(201).json({
        success: true,
        message: 'Visitor photo uploaded successfully',
        data: {
          photoId: photo.photoId,
          filename: photo.filename,
          originalName: photo.originalName,
          mimeType: photo.mimeType,
          size: photo.size,
          uploadedAt: photo.createdAt,
          photoUrl: `/api/photos/${buildingId}/stream/${photo._id}`
        }
      });

    } catch (error) {
      console.error('Upload visitor photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload visitor photo',
        error: error.message
      });
    }
  }
);

// GET /api/visitors/:buildingId/search - Search visitors (MUST come before :buildingId route)
router.get('/:buildingId/search',
  validateParams,
  validateQuery,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY']),
  VisitorController.searchVisitors
);

// GET /api/visitors/:buildingId - Get all visitors for a building (MUST come LAST)
router.get('/:buildingId',
  validateParams,
  validateQuery,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.getVisitors
);

// GET /api/visitors/:buildingId/:visitorId - Get visitor by ID (MUST come after search route)
router.get('/:buildingId/:visitorId',
  validateParams,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.getVisitorById
);

// PUT /api/visitors/:buildingId/:visitorId - Update visitor
router.put('/:buildingId/:visitorId',
  validateParams,
  validateVisitorUpdate,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.updateVisitor
);

// DELETE /api/visitors/:buildingId/:visitorId - Delete visitor (soft delete)
router.delete('/:buildingId/:visitorId',
  validateParams,
  buildingAccess,
  authorizeRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'SECURITY', 'RESIDENT']),
  VisitorController.deleteVisitor
);

module.exports = router;
