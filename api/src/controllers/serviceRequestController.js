const ServiceRequest = require('../models/ServiceRequest');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Building = require('../models/Building');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

class ServiceRequestController {
  /**
   * Create a new service request
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async createServiceRequest(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId } = req.params;
    const { 
      employeeId, 
      employeeCode, 
      employeeName, 
      requestType, 
      title, 
      description, 
      priority, 
      urgency, 
      location, 
      flatNumber, 
      preferredDate, 
      preferredTime 
    } = req.body;
    const requesterId = req.user.id;

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

      // Find employee by ID, code, or name (priority: employeeCode > employeeId > employeeName)
      let employee;
      let searchMethod = '';

      if (employeeCode) {
        // Search by employee code (highest priority)
        employee = await Employee.findOne({
          employeeCode: employeeCode,
          buildingId: buildingId,
          isActive: true,
          employeeType: { $in: ['RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'] }
        });
        searchMethod = 'employee code';
      } else if (employeeId) {
        // Search by employee ID (backward compatibility)
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid employee ID format'
          });
        }
        
        employee = await Employee.findOne({
          _id: employeeId,
          buildingId: buildingId,
          isActive: true,
          employeeType: { $in: ['RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'] }
        });
        searchMethod = 'employee ID';
      } else if (employeeName) {
        // Search by employee name (case-insensitive)
        employee = await Employee.findOne({
          name: { $regex: new RegExp(`^${employeeName.trim()}$`, 'i') },
          buildingId: buildingId,
          isActive: true,
          employeeType: { $in: ['RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'] }
        });
        searchMethod = 'employee name';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either employeeId, employeeCode, or employeeName is required'
        });
      }

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: `Employee not found by ${searchMethod} or not eligible for service requests`
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

      // Set request type display
      const requestTypeDisplayMap = {
        'PLUMBING': 'Plumbing',
        'ELECTRICAL': 'Electrical',
        'HOUSE_HELP': 'House Help',
        'MAINTENANCE': 'Maintenance',
        'CLEANING': 'Cleaning',
        'OTHER': 'Other'
      };

      const requestTypeDisplay = requestTypeDisplayMap[requestType] || 'Other';

      // Generate request ID manually
      const requestId = await ServiceRequest.generateRequestId();
      
      // Create service request
      const serviceRequest = new ServiceRequest({
        requestId: requestId,
        buildingId: buildingId,
        employeeId: employee._id,
        requesterId: requesterId,
        requestType: requestType || 'OTHER',
        requestTypeDisplay: requestTypeDisplay,
        title: title || `${requestTypeDisplay} Service Request`,
        description: description,
        priority: priority || 'MEDIUM',
        urgency: urgency || 'NORMAL',
        location: location || '',
        flatNumber: flatNumber || requester.flatNumber || '',
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTime: preferredTime || ''
      });

      await serviceRequest.save();

      // Populate the request for response
      await serviceRequest.populate([
        { path: 'employeeId', select: 'name employeeType employeeTypeDisplay phoneNumber employeeCode' },
        { path: 'requesterId', select: 'name role email phoneNumber flatNumber' },
        { path: 'buildingId', select: 'name address' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Service request created successfully',
        data: {
          request: {
            id: serviceRequest._id,
            requestId: serviceRequest.requestId,
            requestType: serviceRequest.requestType,
            requestTypeDisplay: serviceRequest.requestTypeDisplay,
            title: serviceRequest.title,
            description: serviceRequest.description,
            priority: serviceRequest.priority,
            urgency: serviceRequest.urgency,
            status: serviceRequest.status,
            location: serviceRequest.location,
            flatNumber: serviceRequest.flatNumber,
            preferredDate: serviceRequest.preferredDate,
            preferredTime: serviceRequest.preferredTime,
            createdAt: serviceRequest.createdAt,
            createdAtFormatted: serviceRequest.createdAtFormatted,
            employee: {
              id: serviceRequest.employeeId._id,
              name: serviceRequest.employeeId.name,
              employeeType: serviceRequest.employeeId.employeeType,
              employeeTypeDisplay: serviceRequest.employeeId.employeeTypeDisplay,
              phoneNumber: serviceRequest.employeeId.phoneNumber,
              employeeCode: serviceRequest.employeeId.employeeCode
            },
            requester: {
              id: serviceRequest.requesterId._id,
              name: serviceRequest.requesterId.name,
              role: serviceRequest.requesterId.role,
              email: serviceRequest.requesterId.email,
              phoneNumber: serviceRequest.requesterId.phoneNumber,
              flatNumber: serviceRequest.requesterId.flatNumber
            },
            building: {
              id: serviceRequest.buildingId._id,
              name: serviceRequest.buildingId.name,
              address: serviceRequest.buildingId.address
            }
          }
        }
      });

    } catch (error) {
      console.error('Create service request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create service request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all service requests for a building
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async getServiceRequests(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      requestType, 
      priority, 
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
          { path: 'employeeId', select: 'name employeeType employeeTypeDisplay phoneNumber employeeCode' },
          { path: 'requesterId', select: 'name role email phoneNumber flatNumber' },
          { path: 'buildingId', select: 'name address' },
          { path: 'completedBy', select: 'name role' }
        ]
      };

      const filters = { status, requestType, priority, startDate, endDate, today };

      const query = { buildingId };
      
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.requestType) {
        query.requestType = filters.requestType;
      }
      if (filters.priority) {
        query.priority = filters.priority;
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

      const requests = await ServiceRequest.find(query)
        .populate(options.populate)
        .sort(options.sort)
        .limit(options.limit * 1)
        .skip((options.page - 1) * options.limit);

      const totalDocs = await ServiceRequest.countDocuments(query);
      const totalPages = Math.ceil(totalDocs / options.limit);

      res.status(200).json({
        success: true,
        message: 'Service requests retrieved successfully',
        data: {
          requests: requests.map(request => ({
            id: request._id,
            requestId: request.requestId,
            requestType: request.requestType,
            requestTypeDisplay: request.requestTypeDisplay,
            title: request.title,
            description: request.description,
            priority: request.priority,
            urgency: request.urgency,
            status: request.status,
            location: request.location,
            flatNumber: request.flatNumber,
            preferredDate: request.preferredDate,
            preferredTime: request.preferredTime,
            createdAt: request.createdAt,
            createdAtFormatted: request.createdAtFormatted,
            completedAt: request.completedAt,
            completedAtFormatted: request.completedAtFormatted,
            completionNotes: request.completionNotes,
            adminNotes: request.adminNotes,
            estimatedCost: request.estimatedCost,
            actualCost: request.actualCost,
            costApproved: request.costApproved,
            employee: {
              id: request.employeeId._id,
              name: request.employeeId.name,
              employeeType: request.employeeId.employeeType,
              employeeTypeDisplay: request.employeeId.employeeTypeDisplay,
              phoneNumber: request.employeeId.phoneNumber,
              employeeCode: request.employeeId.employeeCode
            },
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
      console.error('Get service requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve service requests',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get a specific service request by ID
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async getServiceRequest(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId, requestId } = req.params;

    try {
      const request = await ServiceRequest.findOne({ requestId, buildingId })
        .populate('employeeId', 'name employeeType employeeTypeDisplay phoneNumber employeeCode')
        .populate('requesterId', 'name role email phoneNumber flatNumber')
        .populate('buildingId', 'name address')
        .populate('completedBy', 'name role');

      if (!request) {
        return res.status(404).json({ success: false, message: 'Service request not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Service request retrieved successfully',
        data: {
          request: {
            id: request._id,
            requestId: request.requestId,
            requestType: request.requestType,
            requestTypeDisplay: request.requestTypeDisplay,
            title: request.title,
            description: request.description,
            priority: request.priority,
            urgency: request.urgency,
            status: request.status,
            location: request.location,
            flatNumber: request.flatNumber,
            preferredDate: request.preferredDate,
            preferredTime: request.preferredTime,
            createdAt: request.createdAt,
            createdAtFormatted: request.createdAtFormatted,
            completedAt: request.completedAt,
            completedAtFormatted: request.completedAtFormatted,
            completionNotes: request.completionNotes,
            adminNotes: request.adminNotes,
            estimatedCost: request.estimatedCost,
            actualCost: request.actualCost,
            costApproved: request.costApproved,
            employee: {
              id: request.employeeId._id,
              name: request.employeeId.name,
              employeeType: request.employeeId.employeeType,
              employeeTypeDisplay: request.employeeId.employeeTypeDisplay,
              phoneNumber: request.employeeId.phoneNumber,
              employeeCode: request.employeeId.employeeCode
            },
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
      console.error('Get service request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve service request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update service request status
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async updateServiceRequest(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId, requestId } = req.params;
    const { 
      status, 
      adminNotes, 
      completionNotes, 
      estimatedCost, 
      actualCost, 
      costApproved 
    } = req.body;
    const updatedBy = req.user.id;

    try {
      const request = await ServiceRequest.findOne({ requestId, buildingId });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Service request not found' });
      }

      // Update fields
      if (status) request.status = status;
      if (adminNotes !== undefined) request.adminNotes = adminNotes;
      if (completionNotes !== undefined) request.completionNotes = completionNotes;
      if (estimatedCost !== undefined) request.estimatedCost = estimatedCost;
      if (actualCost !== undefined) request.actualCost = actualCost;
      if (costApproved !== undefined) request.costApproved = costApproved;

      // Set completion details if status is COMPLETED
      if (status === 'COMPLETED') {
        request.completedAt = new Date();
        request.completedBy = updatedBy;
      }

      request.updatedAt = new Date();
      await request.save();

      // Populate for response
      await request.populate([
        { path: 'employeeId', select: 'name employeeType employeeTypeDisplay phoneNumber employeeCode' },
        { path: 'requesterId', select: 'name role email phoneNumber flatNumber' },
        { path: 'buildingId', select: 'name address' },
        { path: 'completedBy', select: 'name role' }
      ]);

      res.status(200).json({
        success: true,
        message: 'Service request updated successfully',
        data: {
          request: {
            id: request._id,
            requestId: request.requestId,
            status: request.status,
            adminNotes: request.adminNotes,
            completionNotes: request.completionNotes,
            estimatedCost: request.estimatedCost,
            actualCost: request.actualCost,
            costApproved: request.costApproved,
            completedAt: request.completedAt,
            completedAtFormatted: request.completedAtFormatted,
            updatedAt: request.updatedAt,
            employee: {
              id: request.employeeId._id,
              name: request.employeeId.name,
              employeeType: request.employeeId.employeeType,
              employeeTypeDisplay: request.employeeId.employeeTypeDisplay,
              phoneNumber: request.employeeId.phoneNumber,
              employeeCode: request.employeeId.employeeCode
            }
          }
        }
      });

    } catch (error) {
      console.error('Update service request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update service request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get service request statistics for a building
   * Accessible by RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
   */
  static async getServiceRequestStats(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;

    try {
      const stats = await ServiceRequest.getRequestStats(buildingId, startDate, endDate);

      res.status(200).json({
        success: true,
        message: 'Service request statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Get service request statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve service request statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = ServiceRequestController;
