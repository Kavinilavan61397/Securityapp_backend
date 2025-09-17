const Visitor = require('../models/Visitor');
const Visit = require('../models/Visit');
const Photo = require('../models/Photo');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

class VisitorController {
  // Create a new visitor
  static async createVisitor(req, res) {
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
        name,
        phoneNumber,
        email,
        Date,
        Time,
        idType,
        idNumber,
        purpose,
        company,
        vehicleNumber,
        emergencyContact,
        // NEW FIELDS - Figma Required
        visitorCategory,
        serviceType,
        employeeCode,
        flatNumbers,
        vehicleType
      } = req.body;

      // Get buildingId from URL params
      const { buildingId } = req.params;

      // Check if visitor already exists with same phone/email in the building
      const existingVisitor = await Visitor.findByPhone(phoneNumber, buildingId);
      if (existingVisitor) {
        return res.status(400).json({
          success: false,
          message: 'Visitor with this phone number already exists in this building'
        });
      }

      // Create visitor without photo initially
      const visitorData = {
        name,
        phoneNumber,
        email,
        Date,
        Time,
        idType,
        idNumber,
        purpose,
        company,
        vehicleNumber,
        emergencyContact,
        buildingId,
        // NEW FIELDS - Figma Required
        visitorCategory: visitorCategory || 'OTHER',
        serviceType,
        employeeCode,
        flatNumbers: flatNumbers ? (Array.isArray(flatNumbers) ? flatNumbers : [flatNumbers]) : [],
        vehicleType: vehicleType || 'OTHER'
      };

      // Remove undefined values
      Object.keys(visitorData).forEach(key => 
        visitorData[key] === undefined && delete visitorData[key]
      );

      const visitor = new Visitor(visitorData);
      await visitor.save();

      res.status(201).json({
        success: true,
        message: 'Visitor created successfully',
        data: {
          visitorId: visitor._id,
          name: visitor.name,
          phoneNumber: visitor.phoneNumber,
          email: visitor.email,
          status: visitor.status,
          createdAt: visitor.createdAt
        }
      });

    } catch (error) {
      console.error('Error creating visitor:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get all visitors for a building
  static async getVisitors(req, res) {
    try {
      console.log('=== getVisitors method started ===');
      
      const { buildingId } = req.params;
      console.log('Building ID from params:', buildingId);
      
      console.log('User info:', {
        role: req.user.role,
        buildingId: req.user.buildingId
      });

      // Validate building access
      console.log('Validating building access...');
      if (req.user.role !== 'SUPER_ADMIN' && req.user.buildingId.toString() !== buildingId) {
        console.log('Access denied');
        return res.status(403).json({
          success: false,
          message: 'Access denied to this building'
        });
      }
      console.log('Building access validated');

      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Get total count and visitors (exclude soft-deleted visitors)
      const totalVisitors = await Visitor.countDocuments({ buildingId, isActive: true });
      const visitors = await Visitor.findByBuilding(buildingId, { skip, limit, isActive: true });

      // Calculate pagination
      const totalPages = Math.ceil(totalVisitors / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      console.log('Sending real response with database data...');
      res.json({
        success: true,
        message: 'Visitors retrieved successfully',
        data: {
          visitors,
          pagination: {
            currentPage: page,
            totalPages,
            totalVisitors,
            hasNextPage,
            hasPrevPage
          }
        }
      });
      
      console.log('=== getVisitors method completed ===');

    } catch (error) {
      console.error('Error in getVisitors:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get visitor by ID
  static async getVisitorById(req, res) {
    try {
      const { visitorId, buildingId } = req.params;

      // Validate building access
      if (req.user.role !== 'SUPER_ADMIN' && req.user.buildingId.toString() !== buildingId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this building'
        });
      }

      const visitor = await Visitor.findById(visitorId)
        .populate('photo', 'url thumbnail dimensions')
        .populate('buildingId', 'name address');

      if (!visitor) {
        return res.status(404).json({
          success: false,
          message: 'Visitor not found'
        });
      }

      // Check if visitor belongs to the specified building
      // Handle both populated and unpopulated buildingId
      const visitorBuildingId = visitor.buildingId._id ? visitor.buildingId._id.toString() : visitor.buildingId.toString();
      
      if (visitorBuildingId !== buildingId) {
        return res.status(403).json({
          success: false,
          message: 'Visitor does not belong to this building'
        });
      }

      // Get visitor's visit history
      const visits = await Visit.findByVisitor(visitorId, buildingId);

      res.json({
        success: true,
        message: 'Visitor retrieved successfully',
        data: {
          visitor,
          visitHistory: visits
        }
      });

    } catch (error) {
      console.error('Error getting visitor:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Update visitor
  static async updateVisitor(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { visitorId, buildingId } = req.params;
      const updateData = req.body;

      // Validate building access
      if (req.user.role !== 'SUPER_ADMIN' && req.user.buildingId.toString() !== buildingId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this building'
        });
      }

      const visitor = await Visitor.findById(visitorId);
      if (!visitor) {
        return res.status(404).json({
          success: false,
          message: 'Visitor not found'
        });
      }

      // Check if visitor belongs to the specified building
      // Handle both populated and unpopulated buildingId
      const visitorBuildingId = visitor.buildingId._id ? visitor.buildingId._id.toString() : visitor.buildingId.toString();
      
      if (visitorBuildingId !== buildingId) {
        return res.status(403).json({
          success: false,
          message: 'Visitor does not belong to this building'
        });
      }

      // Update visitor
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          visitor[key] = updateData[key];
        }
      });

      await visitor.save();

      res.json({
        success: true,
        message: 'Visitor updated successfully',
        data: {
          visitorId: visitor._id,
          name: visitor.name,
          status: visitor.status,
          updatedAt: visitor.updatedAt
        }
      });

    } catch (error) {
      console.error('Error updating visitor:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Search visitors
  static async searchVisitors(req, res) {
    try {
      const { buildingId } = req.params;
      const { query, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      // Validate building access
      if (req.user.role !== 'SUPER_ADMIN' && req.user.buildingId.toString() !== buildingId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this building'
        });
      }

      const searchRegex = new RegExp(query.trim(), 'i');
      
      const visitors = await Visitor.find({
        buildingId,
        isActive: true,
        $or: [
          { name: searchRegex },
          { phoneNumber: searchRegex },
          { email: searchRegex },
          { company: searchRegex },
          { idNumber: searchRegex }
        ]
      })
        .select('name phoneNumber email company photo isBlacklisted totalVisits lastVisitAt')
        .populate('photo', 'url thumbnail')
        .limit(parseInt(limit))
        .sort({ totalVisits: -1, lastVisitAt: -1 });

      res.json({
        success: true,
        message: 'Search completed successfully',
        data: {
          query: query.trim(),
          results: visitors,
          totalResults: visitors.length
        }
      });

    } catch (error) {
      console.error('Error searching visitors:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get visitor statistics
  static async getVisitorStats(req, res) {
    try {
      const { buildingId } = req.params;
      const { startDate, endDate } = req.query;

      // Validate building access
      if (req.user.role !== 'SUPER_ADMIN' && req.user.buildingId.toString() !== buildingId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this building'
        });
      }

      const stats = await Visitor.getVisitorStats(buildingId, startDate, endDate);
      
      // Get additional stats
      const [totalVisits, blacklistedCount] = await Promise.all([
        Visit.countDocuments({ buildingId }),
        Visitor.countDocuments({ buildingId, isBlacklisted: true })
      ]);

      const result = stats[0] || {
        totalVisitors: 0,
        activeVisitors: 0,
        blacklistedVisitors: 0,
        totalVisits: 0
      };

      result.totalVisits = totalVisits;
      result.blacklistedVisitors = blacklistedCount;

      res.json({
        success: true,
        message: 'Visitor statistics retrieved successfully',
        data: result
      });

    } catch (error) {
      console.error('Error getting visitor stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete visitor (soft delete)
  static async deleteVisitor(req, res) {
    try {
      const { visitorId, buildingId } = req.params;

      // Validate building access
      if (req.user.role !== 'SUPER_ADMIN' && req.user.buildingId.toString() !== buildingId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this building'
        });
      }

      // Find visitor
      const visitor = await Visitor.findOne({
        _id: visitorId,
        buildingId: buildingId
      });

      if (!visitor) {
        return res.status(404).json({
          success: false,
          message: 'Visitor not found'
        });
      }

      // Soft delete visitor by setting isActive to false
      visitor.isActive = false;
      visitor.updatedAt = new Date();
      await visitor.save();

      res.status(200).json({
        success: true,
        message: 'Visitor deleted successfully',
        data: {
          visitorId: visitor._id,
          name: visitor.name,
          deletedAt: visitor.updatedAt
        }
      });

    } catch (error) {
      console.error('Error in deleteVisitor:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = VisitorController;
