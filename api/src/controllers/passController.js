const Pass = require('../models/Pass');
const Building = require('../models/Building');
const QRCode = require('qrcode');

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

    // Generate QR code (same as pre-approval system)
    try {
      // Create lightweight QR code data for scanning
      const qrCodeData = {
        type: 'VISITOR_PASS',
        passId: pass._id,
        name: pass.name,
        email: pass.email,
        phoneNumber: pass.phoneNumber,
        reasonForVisit: pass.reasonForVisit,
        startingDate: pass.startingDate,
        endingDate: pass.endingDate,
        buildingId: pass.buildingId._id,
        buildingName: pass.buildingId.name,
        status: pass.status,
        timestamp: Date.now()
      };

      // Create UI-friendly display data
      const displayData = {
        type: 'Visitor Pass',
        visitorName: pass.name,
        email: pass.email,
        phoneNumber: pass.phoneNumber,
        reason: pass.reasonForVisit,
        startDate: new Date(pass.startingDate).toLocaleDateString(),
        endDate: new Date(pass.endingDate).toLocaleDateString(),
        checkInTime: pass.checkInTime,
        buildingName: pass.buildingId.name,
        status: pass.status
      };

      // Generate QR code string and image
      const qrCodeString = JSON.stringify(qrCodeData);
      const qrCodeImage = await QRCode.toDataURL(qrCodeString);

      // Update pass with QR code data
      pass.qrCodeData = JSON.stringify({ ...qrCodeData, displayData });
      pass.qrCodeString = qrCodeString;
      pass.qrCodeImage = qrCodeImage;
      
      await pass.save();
    } catch (qrError) {
      console.error('QR code generation error:', qrError);
      // Continue without QR code if generation fails
    }

    res.status(201).json({
      success: true,
      message: 'Visitor pass created successfully',
      data: {
        ...pass.toObject(),
        qrCode: {
          data: pass.qrCodeData ? JSON.parse(pass.qrCodeData) : null,
          string: pass.qrCodeString,
          imageUrl: pass.qrCodeImage ? `/api/pass/${buildingId}/${pass._id}/qr-image` : null
        }
      }
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

    // Add QR code data to each pass
    const passesWithQR = passes.map(pass => ({
      ...pass.toObject(),
      qrCode: {
        data: pass.qrCodeData ? JSON.parse(pass.qrCodeData) : null,
        string: pass.qrCodeString,
        imageUrl: pass.qrCodeImage ? `/api/pass/${buildingId}/${pass._id}/qr-image` : null
      }
    }));

    res.json({
      success: true,
      message: 'Passes retrieved successfully',
      data: {
        passes: passesWithQR,
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

// Get QR code image for a specific pass
const getQRCodeImage = async (req, res) => {
  try {
    const { buildingId, passId } = req.params;

    // Find the pass
    const pass = await Pass.findOne({ 
      _id: passId, 
      buildingId: buildingId,
      isDeleted: false 
    });

    if (!pass) {
      return res.status(404).json({
        success: false,
        message: 'Visitor pass not found'
      });
    }

    if (!pass.qrCodeImage) {
      return res.status(404).json({
        success: false,
        message: 'QR code not available for this pass'
      });
    }

    // Extract base64 data from data URL
    const base64Data = pass.qrCodeImage.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Set headers for image response
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    res.send(buffer);

  } catch (error) {
    console.error('Get QR code image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve QR code image',
      error: error.message
    });
  }
};

module.exports = {
  createPass,
  getPasses,
  getQRCodeImage
};
