const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Building = require('../models/Building');
const { validationResult } = require('express-validator');

/**
 * Vehicle Controller
 * Handles all vehicle-related operations with role-based access control
 */
class VehicleController {
  /**
   * Add a new vehicle
   * Only residents can add vehicles to their building
   */
  static async addVehicle(req, res) {
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

      const { buildingId } = req.params;
      const {
        vehicleNumber,
        vehicleType,
        brand,
        model,
        color,
        year,
        engineNumber,
        chassisNumber,
        registrationDate,
        insuranceExpiry,
        permitExpiry,
        parkingSlot,
        documents,
        notes
      } = req.body;

      const userId = req.user.userId;

      // Verify building exists and user has access
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check if user is resident of this building
      const user = await User.findById(userId);
      if (!user || user.buildingId?.toString() !== buildingId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only add vehicles to your building.'
        });
      }

      // Check if vehicle number already exists
      const existingVehicle = await Vehicle.findOne({ 
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        isDeleted: { $ne: true }
      });
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this number already exists'
        });
      }

      // Create new vehicle
      const vehicle = new Vehicle({
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        vehicleType,
        brand,
        model,
        color,
        year,
        engineNumber,
        chassisNumber,
        registrationDate,
        insuranceExpiry,
        permitExpiry,
        parkingSlot,
        documents: documents || [],
        notes,
        ownerId: userId,
        buildingId,
        createdBy: userId
      });

      await vehicle.save();

      // Populate owner and building details
      await vehicle.populate([
        { path: 'ownerId', select: 'name email phoneNumber' },
        { path: 'buildingId', select: 'name address' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Vehicle added successfully',
        data: {
          vehicleId: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          fullIdentification: vehicle.fullIdentification,
          owner: vehicle.ownerId,
          building: vehicle.buildingId,
          isVerified: vehicle.isVerified,
          createdAt: vehicle.createdAt
        }
      });

    } catch (error) {
      console.error('Add vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all vehicles for a building
   * Residents: Only their vehicles
   * Building Admin/Security: All building vehicles
   */
  static async getVehicles(req, res) {
    try {
      const { buildingId } = req.params;
      const { page = 1, limit = 10, vehicleType, isVerified, search } = req.query;
      const skip = (page - 1) * limit;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Build filter based on user role
      let filter = { buildingId, isDeleted: { $ne: true } };
      
      // Residents can only see their own vehicles
      if (userRole === 'RESIDENT') {
        filter.ownerId = userId;
      }

      // Apply additional filters
      if (vehicleType) filter.vehicleType = vehicleType;
      if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
      
      if (search) {
        filter.$or = [
          { vehicleNumber: new RegExp(search, 'i') },
          { brand: new RegExp(search, 'i') },
          { model: new RegExp(search, 'i') },
          { color: new RegExp(search, 'i') }
        ];
      }

      const vehicles = await Vehicle.find(filter)
        .populate('ownerId', 'name email phoneNumber')
        .populate('buildingId', 'name address')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Vehicle.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Vehicles retrieved successfully',
        data: {
          vehicles,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalVehicles: total,
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get vehicles error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get single vehicle by ID
   * Access control based on user role
   */
  static async getVehicle(req, res) {
    try {
      const { buildingId, vehicleId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        buildingId,
        isDeleted: { $ne: true }
      }).populate([
        { path: 'ownerId', select: 'name email phoneNumber' },
        { path: 'buildingId', select: 'name address' },
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' }
      ]);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // Check access permissions
      if (userRole === 'RESIDENT' && vehicle.ownerId._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own vehicles.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vehicle retrieved successfully',
        data: vehicle
      });

    } catch (error) {
      console.error('Get vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update vehicle information
   * Only owner can update their vehicle
   */
  static async updateVehicle(req, res) {
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

      const { buildingId, vehicleId } = req.params;
      const updateData = req.body;
      const userId = req.user.userId;

      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        buildingId,
        isDeleted: { $ne: true }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // Check if user is the owner
      if (vehicle.ownerId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own vehicles.'
        });
      }

      // Check if new vehicle number already exists (if being changed)
      if (updateData.vehicleNumber && updateData.vehicleNumber !== vehicle.vehicleNumber) {
        const existingVehicle = await Vehicle.findOne({
          vehicleNumber: updateData.vehicleNumber.toUpperCase().trim(),
          _id: { $ne: vehicleId },
          isDeleted: { $ne: true }
        });
        if (existingVehicle) {
          return res.status(400).json({
            success: false,
            message: 'Vehicle with this number already exists'
          });
        }
      }

      // Update vehicle
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          vehicle[key] = updateData[key];
        }
      });

      vehicle.updatedBy = userId;
      await vehicle.save();

      // Populate updated fields
      await vehicle.populate([
        { path: 'ownerId', select: 'name email phoneNumber' },
        { path: 'buildingId', select: 'name address' }
      ]);

      res.status(200).json({
        success: true,
        message: 'Vehicle updated successfully',
        data: vehicle
      });

    } catch (error) {
      console.error('Update vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Delete vehicle (soft delete)
   * Only owner can delete their vehicle
   */
  static async deleteVehicle(req, res) {
    try {
      const { buildingId, vehicleId } = req.params;
      const userId = req.user.userId;

      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        buildingId,
        isDeleted: { $ne: true }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // Check if user is the owner
      if (vehicle.ownerId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete your own vehicles.'
        });
      }

      // Soft delete
      await vehicle.softDelete(userId);

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully'
      });

    } catch (error) {
      console.error('Delete vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Verify vehicle (Admin only)
   * Building Admin and Super Admin can verify vehicles
   */
  static async verifyVehicle(req, res) {
    try {
      const { buildingId, vehicleId } = req.params;
      const { isVerified, verificationNotes } = req.body;
      const adminId = req.user.userId;

      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        buildingId,
        isDeleted: { $ne: true }
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // Update verification status
      vehicle.isVerified = isVerified;
      vehicle.verificationNotes = verificationNotes || '';
      vehicle.updatedBy = adminId;
      await vehicle.save();

      res.status(200).json({
        success: true,
        message: `Vehicle ${isVerified ? 'verified' : 'unverified'} successfully`,
        data: {
          vehicleId: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          isVerified: vehicle.isVerified,
          verificationNotes: vehicle.verificationNotes
        }
      });

    } catch (error) {
      console.error('Verify vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get vehicle statistics for building
   * Building Admin and Super Admin can view statistics
   */
  static async getVehicleStats(req, res) {
    try {
      const { buildingId } = req.params;

      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Get vehicle counts by type and status
      const [totalVehicles, verifiedVehicles, unverifiedVehicles, vehiclesByType] = await Promise.all([
        Vehicle.countDocuments({ buildingId, isDeleted: { $ne: true } }),
        Vehicle.countDocuments({ buildingId, isDeleted: { $ne: true }, isVerified: true }),
        Vehicle.countDocuments({ buildingId, isDeleted: { $ne: true }, isVerified: false }),
        Vehicle.aggregate([
          { $match: { buildingId: mongoose.Types.ObjectId(buildingId), isDeleted: { $ne: true } } },
          { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      ]);

      const stats = {
        buildingId: building._id,
        buildingName: building.name,
        totalVehicles,
        verifiedVehicles,
        unverifiedVehicles,
        verificationRate: totalVehicles > 0 ? ((verifiedVehicles / totalVehicles) * 100).toFixed(2) : 0,
        vehiclesByType,
        lastUpdated: new Date()
      };

      res.status(200).json({
        success: true,
        message: 'Vehicle statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Get vehicle stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = VehicleController;
