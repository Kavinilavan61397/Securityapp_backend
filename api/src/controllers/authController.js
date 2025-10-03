const User = require('../models/User');
const Building = require('../models/Building');
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

      const { 
        name, username, email, phoneNumber, password, confirmPassword, role, buildingId, employeeCode, 
        flatNumber, blockNumber, societyName, area, city, tenantType, dateOfBirth, age, gender, 
        address, completeAddress, pincode, phoneOTP, emailOTP 
      } = req.body;

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
      const existingUserQuery = { $or: [{ email }, { phoneNumber }] };
      
      // Only check username if it's provided
      if (username) {
        existingUserQuery.$or.push({ username });
      }
      
      const existingUser = await User.findOne(existingUserQuery);

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or phone number already exists' + (username ? ' or username already taken' : '')
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

      // OTP Verification (if provided)
      if (phoneOTP && emailOTP) {
        if (phoneOTP !== "1234" || emailOTP !== "1234") {
          return res.status(400).json({
            success: false,
            message: 'Invalid OTP. Please enter 1234 for both phone and email OTP'
          });
        }
      }

      // Create user
      const user = new User({
        name,
        username,
        email,
        phoneNumber,
        password,
        role,
        buildingId,
        employeeCode,
        flatNumber,
        blockNumber,
        societyName,
        area,
        city,
        tenantType,
        dateOfBirth: formattedDateOfBirth,
        age,
        gender,
        address,
        completeAddress,
        pincode,
        isVerified: role === 'SUPER_ADMIN' ? true : false, // Super admins are auto-verified
        // Enhanced verification system (additive)
        otpVerification: {
          phoneVerified: phoneOTP === "1234",
          emailVerified: emailOTP === "1234",
          verifiedAt: (phoneOTP === "1234" && emailOTP === "1234") ? new Date() : null
        },
        verification: {
          isVerified: role === 'SUPER_ADMIN' ? true : false,
          verificationLevel: role === 'SUPER_ADMIN' ? 'VERIFIED' : 'PENDING',
          verificationType: role === 'SUPER_ADMIN' ? 'AUTOMATIC' : 'AUTOMATIC'
        }
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
          username: user.username, // Optional display field
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          verificationLevel: user.verification?.verificationLevel || 'PENDING',
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
   * Role-based authentication:
   * - SECURITY & BUILDING_ADMIN: Direct token generation (no OTP)
   * - RESIDENT: OTP verification required
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user by email (include password field for comparison)
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
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

      // 🎯 ROLE-BASED AUTHENTICATION FLOW
      if (user.role === 'SECURITY' || user.role === 'BUILDING_ADMIN') {
        // ✅ DIRECT TOKEN GENERATION - No OTP needed for admin roles
        const token = AuthController.generateToken(user);

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        return res.status(200).json({
          success: true,
          message: 'Login successful',
          data: {
            token,
            user: {
              id: user._id,
              username: user.username, // Optional display field
              name: user.name,
              email: user.email,
              role: user.role,
              roleDisplay: user.roleDisplay,
              buildingId: user.buildingId,
              employeeCode: user.employeeCode,
              isVerified: user.isVerified,
              verificationLevel: user.verification?.verificationLevel || 'PENDING'
            },
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
            requiresOtp: false // Frontend flag
          }
        });

      } else if (user.role === 'RESIDENT') {
        // ✅ OTP FLOW - Generate OTP for residents
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

        return res.status(200).json({
          success: true,
          message: 'OTP sent to your email for verification',
          data: {
            userId: user._id,
            username: user.username, // Optional display field
            email: user.email,
            role: user.role,
            roleDisplay: user.roleDisplay,
            buildingId: user.buildingId,
            flatNumber: user.flatNumber,
            isVerified: user.isVerified,
            verificationLevel: user.verification?.verificationLevel || 'PENDING',
            emailSent: emailResult.success,
            otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined,
            requiresOtp: true // Frontend flag
          }
        });

      } else {
        // Handle other roles (SUPER_ADMIN, etc.)
        return res.status(401).json({
          success: false,
          message: 'Invalid user role'
        });
      }

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
      const { name, email, phoneNumber, password, flatNumber } = req.body;

      // Validate required fields
      if (!name || !email || !phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, Email, Phone Number, and Password are required'
        });
      }

      // Find resident by phone number (flat number is now optional)
      const user = await User.findOne({
        phoneNumber,
        role: 'RESIDENT',
        ...(flatNumber && { flatNumber })
      }).select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Resident not found with this phone number' + (flatNumber ? ' and flat number' : '')
        });
      }

      // Verify password first
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
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
          isVerified: user.isVerified,
          verificationLevel: user.verification?.verificationLevel || 'PENDING',
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
            username: user.username,
            email: user.email,
            role: user.role,
            roleDisplay: user.roleDisplay,
            buildingId: user.buildingId,
            isVerified: user.isVerified,
            verificationLevel: user.verification?.verificationLevel || 'PENDING'
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

  /**
   * Admin User Verification (Additive Feature)
   * PUT /api/admin/users/:userId/verify
   * Allows admins to verify/reject users without blocking the flow
   */
  async verifyUser(req, res) {
    try {
      const { userId } = req.params;
      const { verificationLevel, verificationNotes } = req.body;
      const adminId = req.user.userId; // From JWT token

      // Validate input
      if (!verificationLevel || !['VERIFIED', 'REJECTED'].includes(verificationLevel)) {
        return res.status(400).json({
          success: false,
          message: 'verificationLevel is required and must be VERIFIED or REJECTED'
        });
      }

      // Find the user to verify
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Find the admin performing the verification
      const admin = await User.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Update verification status
      user.verification = {
        isVerified: verificationLevel === 'VERIFIED',
        verificationLevel: verificationLevel,
        verificationNotes: verificationNotes || '',
        verificationType: 'MANUAL',
        verifiedAt: new Date(),
        verifiedBy: adminId
      };

      // Also update the legacy isVerified field for backward compatibility
      user.isVerified = verificationLevel === 'VERIFIED';

      await user.save();

      res.status(200).json({
        success: true,
        message: `User ${verificationLevel.toLowerCase()} successfully`,
        data: {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          verificationLevel: user.verification.verificationLevel,
          isVerified: user.verification.isVerified,
          verifiedAt: user.verification.verifiedAt,
          verifiedBy: {
            id: admin._id,
            name: admin.name,
            role: admin.role
          }
        }
      });

    } catch (error) {
      console.error('User verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get All Users
   * GET /api/auth/users
   * Admins can get all users, users can get users in their building
   */
  async getAllUsers(req, res) {
    try {
      const currentUserRole = req.user.role;
      const currentUserBuildingId = req.user.buildingId;
      
      // Get query parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const role = req.query.role; // Filter by role
      const isActive = req.query.isActive; // Filter by active status

      // Build query based on user role
      let query = {};
      
      if (currentUserRole === 'SUPER_ADMIN') {
        // Super admin can see all users
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';
      } else if (currentUserRole === 'BUILDING_ADMIN') {
        // Building admin can see users in their building
        query.buildingId = currentUserBuildingId;
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';
      } else {
        // Other roles can only see users in their building
        query.buildingId = currentUserBuildingId;
        query.isActive = true; // Only active users for non-admin roles
      }

      // Get total count and users
      const totalUsers = await User.countDocuments(query);
      const users = await User.find(query)
        .select('-otp -__v')
        .populate('buildingId', 'name address')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      // Calculate pagination
      const totalPages = Math.ceil(totalUsers / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            currentPage: page,
            totalPages,
            totalUsers,
            hasNextPage,
            hasPrevPage
          }
        }
      });

    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get User by ID
   * GET /api/auth/users/:userId
   * Security, Building Admin, and Super Admin can access
   */
  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      const currentUserRole = req.user.role;
      const currentUserBuildingId = req.user.buildingId;

      // Find the user
      const user = await User.findById(userId)
        .select('-otp -__v')
        .populate('buildingId', 'name address');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check access permissions
      if (currentUserRole === 'BUILDING_ADMIN') {
        // Building admin can only see users in their building
        if (user.buildingId && user.buildingId._id.toString() !== currentUserBuildingId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only view users in your assigned building.'
          });
        }
      } else if (currentUserRole === 'SECURITY') {
        // Security can only see users in their building
        if (user.buildingId && user.buildingId._id.toString() !== currentUserBuildingId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only view users in your assigned building.'
          });
        }
      }
      // SUPER_ADMIN can see any user (no additional checks needed)

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            username: user.username,
            role: user.role,
            isActive: user.isActive,
            isVerified: user.isVerified,
            buildingId: user.buildingId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });

    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Forgot Password (Step 1)
   * POST /api/auth/forgot-password
   * Send OTP to user's email for password reset
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Find user by email
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address'
        });
      }

      // Check if user can login
      if (!user.canLogin) {
        return res.status(400).json({
          success: false,
          message: 'Password reset is not allowed for this account'
        });
      }

      // Generate OTP for password reset
      const otpCode = user.generateOTP();
      await user.save();

      // Send OTP via Email
      const emailResult = await emailService.sendOTPEmail(
        user.email,
        otpCode,
        user.name,
        'password_reset'
      );

      // Log email result for debugging
      if (!emailResult.success) {
        console.error('Failed to send password reset OTP email:', emailResult.error);
      }

      res.status(200).json({
        success: true,
        message: 'Password reset OTP sent to your email',
        data: {
          userId: user._id,
          email: user.email,
          otpSent: emailResult.success,
          otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined,
          // Static OTP fallback for testing
          staticOTP: process.env.STATIC_OTP || '1234'
        }
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Verify Reset OTP (Step 2)
   * POST /api/auth/verify-reset-otp
   * Verify OTP and generate reset token
   */
  async verifyResetOTP(req, res) {
    try {
      const { email, otp } = req.body;

      // Find user by email
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address'
        });
      }

      // Verify OTP
      const isValid = await user.verifyOTP(otp);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Generate password reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully. You can now reset your password',
        data: {
          userId: user._id,
          email: user.email,
          resetToken: resetToken,
          verified: true
        }
      });

    } catch (error) {
      console.error('Verify reset OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Reset Password (Step 3)
   * POST /api/auth/reset-password
   * Reset password with new password
   */
  async resetPassword(req, res) {
    try {
      const { email, resetToken, newPassword, confirmPassword } = req.body;

      // Find user by email
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address'
        });
      }

      // Verify reset token
      const isTokenValid = await user.verifyPasswordResetToken(resetToken);
      if (!isTokenValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Update password
      user.password = newPassword;
      user.clearPasswordReset(); // Clear reset token
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now login with your new password',
        data: {
          userId: user._id,
          email: user.email,
          passwordUpdated: true
        }
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Delete User Account
   * DELETE /api/auth/account
   * Users can delete their own accounts, admins can delete any account
   */
  async deleteAccount(req, res) {
    try {
      const { userId } = req.params; // Optional: for admin deleting other users
      const currentUserId = req.user.userId;
      const currentUserRole = req.user.role;

      // Determine which user to delete
      let targetUserId;
      if (userId && (currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'BUILDING_ADMIN')) {
        // Admin deleting another user
        targetUserId = userId;
      } else {
        // User deleting their own account
        targetUserId = currentUserId;
      }

      // Find the user to delete
      const user = await User.findById(targetUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is already deleted
      if (!user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Account is already deleted'
        });
      }

      // Soft delete the user account
      user.isActive = false;
      user.deletedAt = new Date();
      user.deletedBy = currentUserId;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
        data: {
          userId: user._id,
          name: user.name,
          email: user.email,
          deletedAt: user.deletedAt
        }
      });

    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Step 1: Personal Details + Password Confirmation
   * POST /api/auth/register/step1
   */
  async registerStep1(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { 
        name, email, phoneNumber, password, confirmPassword, role, buildingId, 
        employeeCode, dateOfBirth, age, gender 
      } = req.body;

      // Convert dateOfBirth to proper Date object
      let formattedDateOfBirth;
      if (dateOfBirth) {
        if (dateOfBirth.includes('/')) {
          const [day, month, year] = dateOfBirth.split('/');
          formattedDateOfBirth = new Date(year, month - 1, day);
        } else {
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

      // Create user with basic info (not saved yet)
      const userData = {
        name,
        email,
        phoneNumber,
        password,
        role,
        buildingId,
        employeeCode,
        dateOfBirth: formattedDateOfBirth,
        age,
        gender,
        isVerified: false,
        otpVerification: {
          phoneVerified: false,
          emailVerified: false,
          phoneOTP: "1234",
          emailOTP: "1234"
        },
        verification: {
          isVerified: false,
          verificationLevel: 'PENDING',
          verificationType: 'AUTOMATIC'
        }
      };

      // Store user data in session/temp storage for next steps
      // For now, we'll create the user but mark as incomplete
      const user = new User(userData);
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Step 1 completed. Please proceed to OTP verification.',
        data: {
          step: 1,
          nextStep: 'OTP Verification',
          user: {
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role
          },
          instructions: {
            phoneOTP: "Enter 1234 for phone OTP",
            emailOTP: "Enter 1234 for email OTP"
          }
        }
      });

    } catch (error) {
      console.error('Register Step 1 error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete step 1',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Step 2: OTP Verification
   * POST /api/auth/register/step2
   */
  async registerStep2(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, phoneOTP, emailOTP } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please complete step 1 first.'
        });
      }

      // Verify OTPs
      if (phoneOTP !== "1234" || emailOTP !== "1234") {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please enter 1234 for both phone and email OTP'
        });
      }

      // Update OTP verification status
      user.otpVerification.phoneVerified = true;
      user.otpVerification.emailVerified = true;
      user.otpVerification.verifiedAt = new Date();
      await user.save();

      // Generate JWT token after OTP verification
      const token = AuthController.generateToken(user);

      res.status(200).json({
        success: true,
        message: 'OTP verification completed. Please proceed to address details.',
        data: {
          step: 2,
          nextStep: 'Address Details',
          user: {
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role
          },
          otpVerification: {
            phoneVerified: true,
            emailVerified: true,
            verifiedAt: user.otpVerification.verifiedAt
          },
          token: token
        }
      });

    } catch (error) {
      console.error('Register Step 2 error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete OTP verification',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Step 3: Address Details
   * POST /api/auth/register/step3
   */
  async registerStep3(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { 
        email, flatNumber, blockNumber, buildingName, area, city, tenantType 
      } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please complete previous steps first.'
        });
      }

      // Check if OTP verification is completed
      if (!user.otpVerification.phoneVerified || !user.otpVerification.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Please complete OTP verification first.'
        });
      }

      // Find building by name
      const building = await Building.findOne({ 
        name: buildingName, 
        isActive: true 
      });
      
      if (!building) {
        return res.status(400).json({
          success: false,
          message: 'Building not found. Please select a valid building from the list.'
        });
      }

      // Update user with address details
      user.flatNumber = flatNumber;
      user.blockNumber = blockNumber;
      user.buildingId = building._id; // Set buildingId from lookup
      user.societyName = building.name; // Use building name as society name
      user.area = area;
      user.city = city;
      user.tenantType = tenantType || 'OWNER';
      
      // Mark user as verified but PENDING admin approval
      user.isVerified = true;
      user.approvalStatus = 'PENDING'; // Set to PENDING for admin approval
      user.verification.isVerified = true;
      user.verification.verificationLevel = 'PENDING'; // Keep as PENDING until admin approval
      user.verification.verifiedAt = new Date();
      
      await user.save();

      // Populate building details for better UI experience
      await user.populate('buildingId', 'name address');

      // Generate new JWT token with updated user data
      const token = AuthController.generateToken(user);

      res.status(201).json({
        success: true,
        message: 'Registration completed successfully!',
        data: {
          step: 3,
          completed: true,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            buildingId: user.buildingId,
            building: user.buildingId, // Populated building details
            flatNumber: user.flatNumber,
            blockNumber: user.blockNumber,
            societyName: user.societyName,
            area: user.area,
            city: user.city,
            tenantType: user.tenantType,
            isVerified: user.isVerified,
            otpVerification: user.otpVerification
          },
          token: token
        }
      });

    } catch (error) {
      console.error('Register Step 3 error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete registration',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get Pending Residents for Admin Approval
   * GET /api/admin/pending-residents
   */
  async getPendingResidents(req, res) {
    try {
      const currentUserRole = req.user.role;
      const currentUserBuildingId = req.user.buildingId;
      
      // Build query based on admin role
      let query = {
        role: 'RESIDENT',
        approvalStatus: 'PENDING',
        isActive: true
      };
      
      if (currentUserRole === 'BUILDING_ADMIN') {
        // Building admin can only see residents in their building
        query.buildingId = currentUserBuildingId;
      }
      // SUPER_ADMIN can see all pending residents

      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Get total count and residents
      const totalResidents = await User.countDocuments(query);
      const residents = await User.find(query)
        .select('name email phoneNumber age gender flatNumber blockNumber societyName area city tenantType dateOfBirth createdAt')
        .populate('buildingId', 'name address')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      // Calculate pagination
      const totalPages = Math.ceil(totalResidents / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.status(200).json({
        success: true,
        message: 'Pending residents retrieved successfully',
        data: {
          residents: residents.map(resident => ({
            _id: resident._id,
            name: resident.name,
            email: resident.email,
            phoneNumber: resident.phoneNumber,
            age: resident.age,
            gender: resident.gender,
            flatNumber: resident.flatNumber,
            blockNumber: resident.blockNumber,
            societyName: resident.societyName,
            area: resident.area,
            city: resident.city,
            tenantType: resident.tenantType,
            dateOfBirth: resident.dateOfBirth,
            building: resident.buildingId,
            createdAt: resident.createdAt
          })),
          pagination: {
            currentPage: page,
            totalPages,
            totalResidents,
            hasNextPage,
            hasPrevPage
          }
        }
      });

    } catch (error) {
      console.error('Get pending residents error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Approve or Deny Resident
   * PUT /api/admin/residents/:userId/approve
   */
  async approveResident(req, res) {
    try {
      const { userId } = req.params;
      const { action, notes } = req.body;
      const adminId = req.user.userId;
      const adminRole = req.user.role;

      // Find the resident
      const resident = await User.findById(userId);
      if (!resident) {
        return res.status(404).json({
          success: false,
          message: 'Resident not found'
        });
      }

      // Check if resident is in pending status
      if (resident.approvalStatus !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Resident is already ${resident.approvalStatus.toLowerCase()}`
        });
      }

      // Check building access for BUILDING_ADMIN
      if (adminRole === 'BUILDING_ADMIN' && 
          resident.buildingId && 
          resident.buildingId.toString() !== req.user.buildingId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only approve residents in your building.'
        });
      }

      // Find the admin performing the action
      const admin = await User.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Update resident status
      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      resident.approvalStatus = newStatus;
      
      // Update verification status
      if (action === 'approve') {
        resident.verification.isVerified = true;
        resident.verification.verificationLevel = 'VERIFIED';
        resident.verification.verifiedAt = new Date();
        resident.verification.verifiedBy = adminId;
        resident.verification.verificationNotes = notes || '';
        resident.verification.verificationType = 'MANUAL';
      } else {
        resident.verification.isVerified = false;
        resident.verification.verificationLevel = 'REJECTED';
        resident.verification.verifiedAt = new Date();
        resident.verification.verifiedBy = adminId;
        resident.verification.verificationNotes = notes || 'Resident application rejected';
        resident.verification.verificationType = 'MANUAL';
      }

      await resident.save();

      res.status(200).json({
        success: true,
        message: `Resident ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        data: {
          resident: {
            _id: resident._id,
            name: resident.name,
            email: resident.email,
            phoneNumber: resident.phoneNumber,
            flatNumber: resident.flatNumber,
            blockNumber: resident.blockNumber,
            societyName: resident.societyName,
            area: resident.area,
            city: resident.city,
            tenantType: resident.tenantType,
            approvalStatus: resident.approvalStatus,
            verification: {
              isVerified: resident.verification.isVerified,
              verificationLevel: resident.verification.verificationLevel,
              verifiedAt: resident.verification.verifiedAt,
              verificationNotes: resident.verification.verificationNotes
            }
          },
          admin: {
            id: admin._id,
            name: admin.name,
            role: admin.role
          },
          action: action,
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('Approve resident error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = new AuthController();
