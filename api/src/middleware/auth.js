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
  const authStartTime = Date.now();
  console.log('=== Authentication started ===');
  
  try {
    // Check both lowercase and uppercase authorization headers
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    console.log('Token found, verifying...');
    const tokenVerifyStart = Date.now();
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`Token verification took: ${Date.now() - tokenVerifyStart}ms`);
    
    // Check if user still exists and is active
    console.log('Finding user in database...');
    const userQueryStart = Date.now();
    
    const user = await User.findById(decoded.userId).select('-otp');
    console.log(`User query took: ${Date.now() - userQueryStart}ms`);
    
    if (!user) {
      console.log('User not found');
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
    const roles = user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : []);
    const activeRole = user.activeRole && roles.includes(user.activeRole) ? user.activeRole : roles[0];

    req.user = {
      id: user._id,
      userId: user._id,
      email: user.email,
      role: activeRole,
      roles,
      activeRole,
      name: user.name,
      buildingId: user.buildingId,
      isVerified: user.isVerified
    };

    console.log('Authenticated user:', { email: user.email, roles, activeRole, buildingId: user.buildingId });
    
    const authTotalTime = Date.now() - authStartTime;
    console.log(`=== Authentication completed in ${authTotalTime}ms ===`);
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
        console.log('No user found');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      console.log('=== authorizeRoles middleware started ===');
      const userRoles = req.user.roles && req.user.roles.length ? req.user.roles : [req.user.role];
      const activeRole = req.user.activeRole || req.user.role;

      console.log('User roles:', userRoles);
      console.log('Active role:', activeRole);
      console.log('Allowed roles:', allowedRoles);

      if (allowedRoles.includes(activeRole)) {
        console.log('Role authorized successfully');
        return next();
      }

      const hasMatchingRole = userRoles.some(role => allowedRoles.includes(role));

      if (hasMatchingRole) {
        console.log('Access denied - switch required');
        return res.status(403).json({
          success: false,
          message: 'Access denied. Please switch account to an authorized role before accessing this resource.'
        });
      }

      console.log('Access denied - role not allowed');
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });

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
const buildingAccess = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Super admins can access all buildings
      const userRoles = req.user.roles && req.user.roles.length ? req.user.roles : [req.user.role];
      if (userRoles.includes('SUPER_ADMIN')) {
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

      // Check if user has a buildingId assigned and if it matches the requested building
      if (req.user.buildingId && req.user.buildingId.toString() !== buildingId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your assigned building.'
        });
      }

      // If user doesn't have a buildingId but is not a Super Admin, deny access
      if (!req.user.buildingId && !userRoles.includes('SUPER_ADMIN')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You must be assigned to a building.'
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

/**
 * Admin Approval Status Check
 * Ensures user has been approved by admin before accessing restricted features
 * @param {Array} allowedStatuses - Array of allowed approval statuses
 * @returns {Function} Middleware function
 */
const requireApproval = (allowedStatuses = ['APPROVED']) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user with approval status
      const user = await User.findById(req.user.userId).select('approvalStatus role roles');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Super admins and building admins don't need approval
      const userRoles = user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : []);
      if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('BUILDING_ADMIN')) {
        return next();
      }

      // Check approval status
      if (!allowedStatuses.includes(user.approvalStatus)) {
        return res.status(403).json({
          success: false,
          message: 'Account pending admin approval. Please wait for approval to access this feature.',
          data: {
            approvalStatus: user.approvalStatus,
            status: 'PENDING_APPROVAL'
          }
        });
      }

      next();

    } catch (error) {
      console.error('Approval check error:', error);
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
  otpRateLimit,
  requireApproval
};
