const Building = require('../models/Building');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Building Controller
 * Handles all building-related operations with role-based access control
 */
class BuildingController {
  /**
   * Create a new building
   * Only SUPER_ADMIN can create buildings
   */
  static async createBuilding(req, res) {
    try {
      // Check validation errors
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
        address,
        totalFloors,
        totalFlats,
        image,
        contactPhone,
        contactEmail,
        features,
        operatingHours,
        securitySettings
      } = req.body;

      // Check if building name already exists
      const existingBuilding = await Building.findOne({ name });
      if (existingBuilding) {
        return res.status(400).json({
          success: false,
          message: 'Building with this name already exists'
        });
      }

      // Create new building
      const building = new Building({
        name,
        address: address ? {
          street: address.street || undefined,
          city: address.city || undefined,
          state: address.state || undefined,
          pincode: address.pincode || undefined,
          country: address.country || 'India'
        } : {
          country: 'India'
        },
        totalFloors: totalFloors || 1,
        totalFlats: totalFlats || 1,
        image: image || null,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        features: features || [],
        operatingHours: operatingHours || {
          open: '06:00',
          close: '22:00',
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        securitySettings: securitySettings || {
          visitorCheckIn: true,
          visitorCheckOut: true,
          photoCapture: true,
          idVerification: true,
          notificationAlerts: true
        },
        isActive: true
      });

      await building.save();

      res.status(201).json({
        success: true,
        message: 'Building created successfully',
        data: {
          buildingId: building._id,
          name: building.name,
          address: building.fullAddress,
          totalFloors: building.totalFloors,
          totalFlats: building.totalFlats,
          status: building.status,
          createdAt: building.createdAt
        }
      });

    } catch (error) {
      console.error('Building creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all buildings (with pagination and filtering)
   * SUPER_ADMIN: All buildings
   * BUILDING_ADMIN: Only their building
   */
  static async getBuildings(req, res) {
    try {
      const { page = 1, limit = 10, city, pincode, status } = req.query;
      const skip = (page - 1) * limit;

      // Build filter based on user role
      let filter = {};
      
      if (req.user.role === 'BUILDING_ADMIN') {
        filter.adminId = req.user._id;
      }

      if (city) filter['address.city'] = new RegExp(city, 'i');
      if (pincode) filter['address.pincode'] = pincode;
      if (status) filter.isActive = status === 'active';

      const buildings = await Building.find(filter)
        .select('name address totalFloors totalFlats image isActive adminId contactPhone contactEmail createdAt')
        .populate('adminId', 'name email phoneNumber')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Building.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Buildings retrieved successfully',
        data: {
          buildings,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalBuildings: total,
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get buildings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get building by ID
   * Access control based on user role
   */
  static async getBuildingById(req, res) {
    try {
      const { buildingId } = req.params;

      const building = await Building.findById(buildingId)
        .populate('adminId', 'name email phoneNumber');

      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check access permissions
      if (req.user.role === 'BUILDING_ADMIN' && building.adminId && building.adminId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your assigned building.'
        });
      }

      // Security users can only access buildings they're assigned to
      if (req.user.role === 'SECURITY' && building._id.toString() !== req.user.buildingId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your assigned building.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Building retrieved successfully',
        data: building
      });

    } catch (error) {
      console.error('Get building error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update building
   * Only SUPER_ADMIN and assigned BUILDING_ADMIN can update
   */
  static async updateBuilding(req, res) {
    try {
      const { buildingId } = req.params;
      const updateData = req.body;

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      if (req.user.role === 'BUILDING_ADMIN' && building.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your assigned building.'
        });
      }

      // Update building
      const updatedBuilding = await Building.findByIdAndUpdate(
        buildingId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate('adminId', 'name email phoneNumber');

      res.status(200).json({
        success: true,
        message: 'Building updated successfully',
        data: updatedBuilding
      });

    } catch (error) {
      console.error('Update building error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Delete building (soft delete)
   * Only SUPER_ADMIN can delete
   */
  static async deleteBuilding(req, res) {
    try {
      const { buildingId } = req.params;

      // Only SUPER_ADMIN can delete buildings
      if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only Super Admin can delete buildings.'
        });
      }

      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check if building has active users
      const activeUsers = await User.countDocuments({
        buildingId: buildingId,
        isActive: true
      });

      if (activeUsers > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete building. It has ${activeUsers} active users.`
        });
      }

      // Soft delete - mark as inactive
      building.isActive = false;
      building.deletedAt = new Date();
      await building.save();

      res.status(200).json({
        success: true,
        message: 'Building deleted successfully'
      });

    } catch (error) {
      console.error('Delete building error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get building statistics
   * Access control based on user role
   */
  static async getBuildingStats(req, res) {
    try {
      const { buildingId } = req.params;

      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check access permissions
      if (req.user.role === 'BUILDING_ADMIN' && building.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view stats for your assigned building.'
        });
      }

      // Get user counts by role
      const [residents, security, admins] = await Promise.all([
        User.countDocuments({ buildingId, role: 'RESIDENT', isActive: true }),
        User.countDocuments({ buildingId, role: 'SECURITY', isActive: true }),
        User.countDocuments({ buildingId, role: 'BUILDING_ADMIN', isActive: true })
      ]);

      const stats = {
        buildingId: building._id,
        buildingName: building.name,
        totalFloors: building.totalFloors,
        totalFlats: building.totalFlats,
        occupancy: {
          residents,
          security,
          admins,
          total: residents + security + admins
        },
        status: building.status,
        lastUpdated: building.updatedAt
      };

      res.status(200).json({
        success: true,
        message: 'Building statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Get building stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get public buildings list (for registration dropdown)
   * No authentication required
   */
  static async getPublicBuildings(req, res) {
    try {
      // Get all active buildings for registration dropdown
      const buildings = await Building.find({ isActive: true })
        .select('name address')
        .sort({ name: 1 }); // Sort by name alphabetically

      res.status(200).json({
        success: true,
        message: 'Buildings retrieved successfully',
        data: {
          buildings: buildings.map(building => ({
            id: building._id,
            name: building.name,
            address: building.address,
            displayName: `${building.name} - ${building.address.city}`
          }))
        }
      });

    } catch (error) {
      console.error('Get public buildings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Search buildings
   * Dynamic search with multiple criteria
   */
  static async searchBuildings(req, res) {
    try {
      const { query, city, pincode, features, status } = req.query;
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      // Build search filter
      let filter = {};
      
      if (query) {
        filter.$or = [
          { name: new RegExp(query, 'i') },
          { 'address.city': new RegExp(query, 'i') },
          { 'address.street': new RegExp(query, 'i') }
        ];
      }

      if (city) filter['address.city'] = new RegExp(city, 'i');
      if (pincode) filter['address.pincode'] = pincode;
      if (features) filter.features = { $in: features.split(',') };
      if (status) filter.isActive = status === 'active';

      const buildings = await Building.find(filter)
        .select('name address totalFloors totalFlats image isActive adminId createdAt')
        .populate('adminId', 'name email')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Building.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Buildings search completed',
        data: {
          buildings,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalResults: total,
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Search buildings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = BuildingController;
