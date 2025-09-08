const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');

/**
 * Authentication Controller
 * Handles user registration, login, OTP verification, and role-based access
 * 100% Dynamic - No hardcoded values
 */

class AuthController {
  
  /**
   * Generate JWT Token
   * @param {Object} user - User object
   * @returns {String} JWT token
   */
  static generateToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        buildingId: user.buildingId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * User Registration
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, email, phoneNumber, role, buildingId, employeeCode, flatNumber, tenantType, dateOfBirth, age, gender, address, completeAddress, city, pincode } = req.body;

      // Convert dateOfBirth to proper Date object
      let formattedDateOfBirth;
      if (dateOfBirth) {
        if (dateOfBirth.includes('/')) {
          // Handle dd/mm/yyyy format from UI
          const [day, month, year] = dateOfBirth.split('/');
          formattedDateOfBirth = new Date(year, month - 1, day);
        } else {
          // Handle ISO8601 or yyyy-mm-dd format
          formattedDateOfBirth = new Date(dateOfBirth);
        }
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { phoneNumber }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or phone number already exists'
        });
      }

      // Validate role-specific requirements
      if (['BUILDING_ADMIN', 'SECURITY'].includes(role) && !employeeCode) {
        return res.status(400).json({
          success: false,
          message: 'Employee code is required for this role'
        });
      }

      // Note: flatNumber and tenantType are now optional for residents

      // Create user
      const user = new User({
        name,
        email,
        phoneNumber,
        role,
        buildingId,
        employeeCode,
        flatNumber,
        tenantType,
        dateOfBirth: formattedDateOfBirth,
        age,
        gender,
        address,
        completeAddress,
        city,
        pincode,
        isVerified: role === 'SUPER_ADMIN' ? true : false // Super admins are auto-verified
      });

      await user.save();

      // Generate OTP for verification
      const otpCode = user.generateOTP();
      await user.save();

      // Send OTP via Email
      const emailResult = await emailService.sendOTPEmail(
        user.email,
        otpCode,
        user.name,
        'registration'
      );

      // Log email result for debugging
      if (!emailResult.success) {
        console.error('Failed to send registration OTP email:', emailResult.error);
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully. OTP sent to your email for verification.',
        data: {
          userId: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          emailSent: emailResult.success,
          otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * User Login
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, phoneNumber, role } = req.body;

      // Find user by email or phone number
      const user = await User.findOne({
        $or: [{ email }, { phoneNumber }],
        role: role || { $exists: true }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
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
          message: 'Login access is disabled for this account'
        });
      }

      // Generate OTP for verification
      const otpCode = user.generateOTP();
      await user.save();

      // Send OTP via Email
      const emailResult = await emailService.sendOTPEmail(
        user.email,
        otpCode,
        user.name,
        'login'
      );

      // Log email result for debugging
      if (!emailResult.success) {
        console.error('Failed to send login OTP email:', emailResult.error);
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent to your email for verification',
        data: {
          userId: user._id,
          email: user.email,
          role: user.role,
          emailSent: emailResult.success,
          otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Resident Login (Figma Design Flow)
   * POST /api/auth/resident-login
   * Matches the "Sign in to Your Account" screen from Figma
   */
  async residentLogin(req, res) {
    try {
      const { name, email, phoneNumber, flatNumber } = req.body;

      // Validate required fields
      if (!name || !email || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Name, Email, and Phone Number are required'
        });
      }

      // Find resident by phone number (flat number is now optional)
      const user = await User.findOne({
        phoneNumber,
        role: 'RESIDENT',
        ...(flatNumber && { flatNumber })
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Resident not found with this phone number' + (flatNumber ? ' and flat number' : '')
        });
      }

      // Verify additional details match
      if (user.name.toLowerCase() !== name.toLowerCase() || 
          user.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(401).json({
          success: false,
          message: 'Details do not match our records'
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
          message: 'Login access is disabled for this account'
        });
      }

      // Generate OTP for verification
      const otpCode = user.generateOTP();
      await user.save();

      // Send OTP via Email (for now, can be extended to SMS)
      const emailResult = await emailService.sendOTPEmail(
        user.email,
        otpCode,
        user.name,
        'resident-login'
      );

      // Log email result for debugging
      if (!emailResult.success) {
        console.error('Failed to send resident login OTP email:', emailResult.error);
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent to your registered phone number',
        data: {
          userId: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          flatNumber: user.flatNumber,
          role: user.role,
          otpSent: true,
          otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
        }
      });

    } catch (error) {
      console.error('Resident login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * OTP Verification
   * POST /api/auth/verify-otp
   */
  async verifyOTP(req, res) {
    try {
      const { userId, otp } = req.body;

      if (!otp) {
        return res.status(400).json({
          success: false,
          message: 'OTP is required'
        });
      }

      let user;

      if (userId) {
        // If userId is provided, find user by ID (backward compatibility)
        user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
      } else {
        // If userId is not provided, find user by active OTP
        // This matches the Figma design where only OTP is required
        user = await User.findOne({
          'otp.code': { $exists: true },
          'otp.expiresAt': { $gt: new Date() }
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'No active OTP found. Please request a new OTP.'
          });
        }
      }

      // Verify OTP
      const isValid = await user.verifyOTP(otp);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Update user verification status if needed
      const wasUnverified = !user.isVerified;
      if (!user.isVerified) {
        user.isVerified = true;
        await user.save();
      }

      // Send welcome email if this was the first verification
      if (wasUnverified) {
        const welcomeResult = await emailService.sendWelcomeEmail(
          user.email,
          user.name,
          user.role
        );
        
        if (!welcomeResult.success) {
          console.error('Failed to send welcome email:', welcomeResult.error);
        }
      }

      // Generate JWT token
      const token = AuthController.generateToken(user);

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            roleDisplay: user.roleDisplay,
            buildingId: user.buildingId,
            isVerified: user.isVerified
          },
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      });

    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Resend OTP
   * POST /api/auth/resend-otp
   */
  async resendOTP(req, res) {
    try {
      const { userId } = req.body;

      let user;

      if (userId) {
        // If userId is provided, find user by ID
        user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
      } else {
        // If userId is not provided, find user by most recent OTP request
        // This matches the Figma design where only OTP is required
        user = await User.findOne({
          'otp.code': { $exists: true },
          'otp.expiresAt': { $gt: new Date() }
        }).sort({ 'otp.expiresAt': -1 });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'No active OTP found. Please login again to request a new OTP.'
          });
        }
      }

      // Generate new OTP
      const otpCode = user.generateOTP();
      await user.save();

      // Send OTP via Email
      const emailResult = await emailService.sendOTPEmail(
        user.email,
        otpCode,
        user.name,
        'verification'
      );

      // Log email result for debugging
      if (!emailResult.success) {
        console.error('Failed to send resend OTP email:', emailResult.error);
      }

      res.status(200).json({
        success: true,
        message: 'New OTP sent to your email successfully',
        data: {
          userId: user._id,
          emailSent: emailResult.success,
          otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
        }
      });

    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get Current User Profile
   * GET /api/auth/profile
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId)
        .select('-otp -__v')
        .populate('buildingId', 'name address');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update User Profile
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      const { name, age, gender, profilePicture, address, completeAddress, city, pincode } = req.body;

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update allowed fields
      if (name) user.name = name;
      if (age) user.age = age;
      if (gender) user.gender = gender;
      if (profilePicture) user.profilePicture = profilePicture;
      if (address) user.address = address;
      if (completeAddress) user.completeAddress = completeAddress;
      if (city) user.city = city;
      if (pincode) user.pincode = pincode;

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            age: user.age,
            gender: user.gender,
            profilePicture: user.profilePicture
          }
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Logout (Client-side token removal)
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      // In JWT-based auth, logout is handled client-side by removing the token
      // Server-side we can add the token to a blacklist if needed
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Test Email Service
   * POST /api/auth/test-email
   */
  async testEmailService(req, res) {
    try {
      const result = await emailService.testEmailService();
      
      res.status(result.success ? 200 : 500).json({
        success: result.success,
        message: result.message,
        error: result.error
      });

    } catch (error) {
      console.error('Email service test error:', error);
      res.status(500).json({
        success: false,
        message: 'Email service test failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = new AuthController();
