const MaintenanceRequest = require('../models/MaintenanceRequest');
const User = require('../models/User');
const Building = require('../models/Building');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

class MaintenanceRequestController {
  /**
   * Create a new maintenance request
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async createMaintenanceRequest(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId } = req.params;
    const { 
      description, 
      location, 
      flatNumber 
    } = req.body;
    const requesterId = req.user.userId; // Fixed: should be userId, not id

    try {
      // Validate building ID
      if (!mongoose.Types.ObjectId.isValid(buildingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid building ID format'
        });
      }

      // Check if building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Get requester details
      const requester = await User.findById(requesterId);
      if (!requester) {
        return res.status(404).json({
          success: false,
          message: 'Requester not found'
        });
      }

      // Process image data if provided (using multer like photo system)
      let imageBase64 = null;
      let imageMimeType = 'image/jpeg';
      let imageSize = 0;
      
      if (req.file) {
        // Convert file buffer to base64 (same as user profile system)
        imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        imageMimeType = req.file.mimetype;
        imageSize = req.file.size;
        
        // Validate image size (10MB limit)
        if (imageSize > 10485760) {
          return res.status(400).json({
            success: false,
            message: 'Image size cannot exceed 10MB'
          });
        }
      }

      // Generate request ID manually
      const requestId = await MaintenanceRequest.generateRequestId();
      
      // Create maintenance request
      const maintenanceRequest = new MaintenanceRequest({
        requestId: requestId,
        buildingId: buildingId,
        requesterId: requesterId,
        description: description,
        imageBase64: imageBase64 || null,
        imageMimeType: imageMimeType,
        imageSize: imageSize,
        location: location || '',
        flatNumber: flatNumber || requester.flatNumber || ''
      });

      await maintenanceRequest.save();

      // Populate the request for response
      await maintenanceRequest.populate([
        { path: 'requesterId', select: 'name role email phoneNumber flatNumber' },
        { path: 'buildingId', select: 'name address' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Maintenance request created successfully',
        data: {
          request: {
            id: maintenanceRequest._id,
            requestId: maintenanceRequest.requestId,
            description: maintenanceRequest.description,
            status: maintenanceRequest.status,
            location: maintenanceRequest.location,
            flatNumber: maintenanceRequest.flatNumber,
            imageUrl: maintenanceRequest.imageUrl,
            imageMimeType: maintenanceRequest.imageMimeType,
            imageSize: maintenanceRequest.imageSize,
            createdAt: maintenanceRequest.createdAt,
            createdAtFormatted: maintenanceRequest.createdAtFormatted,
            requester: {
              id: maintenanceRequest.requesterId._id,
              name: maintenanceRequest.requesterId.name,
              role: maintenanceRequest.requesterId.role,
              email: maintenanceRequest.requesterId.email,
              phoneNumber: maintenanceRequest.requesterId.phoneNumber,
              flatNumber: maintenanceRequest.requesterId.flatNumber
            },
            building: {
              id: maintenanceRequest.buildingId._id,
              name: maintenanceRequest.buildingId.name,
              address: maintenanceRequest.buildingId.address
            }
          }
        }
      });

    } catch (error) {
      console.error('Create maintenance request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create maintenance request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all maintenance requests for a building
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async getMaintenanceRequests(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate, 
      today 
    } = req.query;

    try {
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        populate: [
          { path: 'requesterId', select: 'name role email phoneNumber flatNumber' },
          { path: 'buildingId', select: 'name address' },
          { path: 'completedBy', select: 'name role' }
        ]
      };

      const filters = { status, startDate, endDate, today };

      const query = { buildingId };
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.startDate && filters.endDate) {
        query.createdAt = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      } else if (filters.today === 'true') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        query.createdAt = {
          $gte: startOfToday,
          $lte: endOfToday
        };
      }

      const requests = await MaintenanceRequest.find(query)
        .populate(options.populate)
        .sort(options.sort)
        .limit(options.limit * 1)
        .skip((options.page - 1) * options.limit);

      const totalDocs = await MaintenanceRequest.countDocuments(query);
      const totalPages = Math.ceil(totalDocs / options.limit);

      res.status(200).json({
        success: true,
        message: 'Maintenance requests retrieved successfully',
        data: {
          requests: requests.map(request => ({
            id: request._id,
            requestId: request.requestId,
            description: request.description,
            status: request.status,
            location: request.location,
            flatNumber: request.flatNumber,
            imageUrl: request.imageUrl,
            imageMimeType: request.imageMimeType,
            imageSize: request.imageSize,
            adminNotes: request.adminNotes,
            completionNotes: request.completionNotes,
            createdAt: request.createdAt,
            createdAtFormatted: request.createdAtFormatted,
            completedAt: request.completedAt,
            completedAtFormatted: request.completedAtFormatted,
            requester: {
              id: request.requesterId._id,
              name: request.requesterId.name,
              role: request.requesterId.role,
              email: request.requesterId.email,
              phoneNumber: request.requesterId.phoneNumber,
              flatNumber: request.requesterId.flatNumber
            },
            completedBy: request.completedBy ? {
              id: request.completedBy._id,
              name: request.completedBy.name,
              role: request.completedBy.role
            } : null
          })),
          pagination: {
            totalDocs: totalDocs,
            limit: options.limit,
            page: options.page,
            totalPages: totalPages,
            nextPage: options.page < totalPages ? options.page + 1 : null,
            prevPage: options.page > 1 ? options.page - 1 : null,
            hasPrevPage: options.page > 1,
            hasNextPage: options.page < totalPages
          }
        }
      });

    } catch (error) {
      console.error('Get maintenance requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve maintenance requests',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get a specific maintenance request by ID
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async getMaintenanceRequest(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId, requestId } = req.params;

    try {
      const request = await MaintenanceRequest.findOne({ requestId, buildingId })
        .populate('requesterId', 'name role email phoneNumber flatNumber')
        .populate('buildingId', 'name address')
        .populate('completedBy', 'name role');

      if (!request) {
        return res.status(404).json({ success: false, message: 'Maintenance request not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Maintenance request retrieved successfully',
        data: {
          request: {
            id: request._id,
            requestId: request.requestId,
            description: request.description,
            status: request.status,
            location: request.location,
            flatNumber: request.flatNumber,
            imageUrl: request.imageUrl,
            imageMimeType: request.imageMimeType,
            imageSize: request.imageSize,
            adminNotes: request.adminNotes,
            completionNotes: request.completionNotes,
            createdAt: request.createdAt,
            createdAtFormatted: request.createdAtFormatted,
            completedAt: request.completedAt,
            completedAtFormatted: request.completedAtFormatted,
            requester: {
              id: request.requesterId._id,
              name: request.requesterId.name,
              role: request.requesterId.role,
              email: request.requesterId.email,
              phoneNumber: request.requesterId.phoneNumber,
              flatNumber: request.requesterId.flatNumber
            },
            completedBy: request.completedBy ? {
              id: request.completedBy._id,
              name: request.completedBy.name,
              role: request.completedBy.role
            } : null
          }
        }
      });

    } catch (error) {
      console.error('Get maintenance request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve maintenance request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update maintenance request status
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async updateMaintenanceRequest(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId, requestId } = req.params;
    const { 
      status, 
      adminNotes, 
      completionNotes
    } = req.body;
    const updatedBy = req.user.id;

    try {
      const request = await MaintenanceRequest.findOne({ requestId, buildingId });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Maintenance request not found' });
      }

      // Update fields
      if (status) request.status = status;
      if (adminNotes !== undefined) request.adminNotes = adminNotes;
      if (completionNotes !== undefined) request.completionNotes = completionNotes;

      // Set completion details if status is COMPLETED
      if (status === 'COMPLETED') {
        request.completedAt = new Date();
        request.completedBy = updatedBy;
      }

      request.updatedAt = new Date();
      await request.save();

      // Populate for response
      await request.populate([
        { path: 'requesterId', select: 'name role email phoneNumber flatNumber' },
        { path: 'buildingId', select: 'name address' },
        { path: 'completedBy', select: 'name role' }
      ]);

      res.status(200).json({
        success: true,
        message: 'Maintenance request updated successfully',
        data: {
          request: {
            id: request._id,
            requestId: request.requestId,
            status: request.status,
            adminNotes: request.adminNotes,
            completionNotes: request.completionNotes,
            completedAt: request.completedAt,
            completedAtFormatted: request.completedAtFormatted,
            updatedAt: request.updatedAt,
            requester: {
              id: request.requesterId._id,
              name: request.requesterId.name,
              role: request.requesterId.role
            }
          }
        }
      });

    } catch (error) {
      console.error('Update maintenance request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update maintenance request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get maintenance request statistics for a building
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async getMaintenanceRequestStats(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;

    try {
      const stats = await MaintenanceRequest.getRequestStats(buildingId, startDate, endDate);

      res.status(200).json({
        success: true,
        message: 'Maintenance request statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Get maintenance request statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve maintenance request statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = MaintenanceRequestController;
