const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * JWT verification and role-based access control
 * 100% Dynamic - No hardcoded values
 */

/**
 * Verify JWT Token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.userId).select('-otp');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    if (!user.canLogin) {
      return res.status(401).json({
        success: false,
        message: 'Login access is disabled'
      });
    }

    // Add user info to request
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      buildingId: user.buildingId,
      isVerified: user.isVerified
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Role-based Access Control
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      next();

    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Permission-based Access Control
 * @param {String} permission - Required permission
 * @returns {Function} Middleware function
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user with methods
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.hasPermission(permission)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      next();

    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Building Access Control
 * Ensures user can only access their assigned building
 * @returns {Function} Middleware function
 */
const buildingAccess = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Super admins can access all buildings
      if (req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      // Building admins, security, and residents are restricted to their building
      const buildingId = req.params.buildingId || req.body.buildingId || req.query.buildingId;
      
      if (!buildingId) {
        return res.status(400).json({
          success: false,
          message: 'Building ID is required'
        });
      }

      if (req.user.buildingId && req.user.buildingId.toString() !== buildingId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your assigned building.'
        });
      }

      next();

    } catch (error) {
      console.error('Building access error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Account Verification Check
 * Ensures user account is verified before accessing protected routes
 * @returns {Function} Middleware function
 */
const requireVerification = () => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!req.user.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Account verification required. Please verify your account first.'
        });
      }

      next();

    } catch (error) {
      console.error('Verification check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Rate Limiting for OTP
 * Prevents OTP abuse
 * @returns {Function} Middleware function
 */
const otpRateLimit = () => {
  const attempts = new Map();
  
  return (req, res, next) => {
    try {
      const { email, phoneNumber } = req.body;
      const identifier = email || phoneNumber;
      
      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Email or phone number is required'
        });
      }

      const now = Date.now();
      const userAttempts = attempts.get(identifier) || { count: 0, firstAttempt: now };
      
      // Reset counter if 1 hour has passed
      if (now - userAttempts.firstAttempt > 60 * 60 * 1000) {
        userAttempts.count = 0;
        userAttempts.firstAttempt = now;
      }
      
      // Check if limit exceeded (5 attempts per hour)
      if (userAttempts.count >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Too many OTP requests. Please try again later.'
        });
      }
      
      // Increment counter
      userAttempts.count++;
      attempts.set(identifier, userAttempts);
      
      next();

    } catch (error) {
      console.error('OTP rate limit error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Export middleware functions
module.exports = {
  authenticateToken,
  authorizeRoles,
  requirePermission,
  buildingAccess,
  requireVerification,
  otpRateLimit
};
