const Pass = require('../models/Pass');
const Building = require('../models/Building');

/**
 * Pass Controller
 * Handles visitor pass creation and management
 */

// Create a new visitor pass
const createPass = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.userId;
    const {
      name,
      email,
      phoneNumber,
      reasonForVisit,
      startingDate,
      endingDate,
      checkInTime,
      status = 'PENDING'
    } = req.body;

    // Validate building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Create the pass
    const pass = new Pass({
      name,
      email,
      phoneNumber,
      reasonForVisit,
      startingDate: new Date(startingDate),
      endingDate: new Date(endingDate),
      checkInTime,
      status,
      buildingId,
      createdBy: userId
    });

    await pass.save();

    // Populate the response with creator and building info
    await pass.populate([
      { path: 'createdBy', select: 'name email role' },
      { path: 'buildingId', select: 'name address.city' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Visitor pass created successfully',
      data: pass
    });

  } catch (error) {
    console.error('Create pass error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // Handle date validation error
    if (error.message === 'Ending date cannot be before starting date') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create visitor pass',
      error: error.message
    });
  }
};

// Get all passes for a building
const getPasses = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    // Validate building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Build query
    const query = {
      buildingId,
      isDeleted: false
    };

    // Add status filter if provided
    if (status && ['PENDING', 'APPROVED', 'ACTIVE', 'EXPIRED', 'CANCELLED'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get passes with pagination
    const passes = await Pass.find(query)
      .populate('createdBy', 'name email role')
      .populate('buildingId', 'name address.city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalPasses = await Pass.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalPasses / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      message: 'Passes retrieved successfully',
      data: {
        passes,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPasses,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get passes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve passes',
      error: error.message
    });
  }
};

module.exports = {
  createPass,
  getPasses
};
