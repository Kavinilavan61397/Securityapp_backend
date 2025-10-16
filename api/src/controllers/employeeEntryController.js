const EmployeeEntry = require('../models/EmployeeEntry');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Building = require('../models/Building');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

class EmployeeEntryController {
  
  /**
   * Log employee entry
   * Access: SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
   */
  static async logEmployeeEntry(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { buildingId } = req.params;
      const { employeeId, employeeCode, employeeName, purpose, notes } = req.body;
      const userId = req.user.id;

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
          message: `Employee not found by ${searchMethod} or not eligible for entry tracking`
        });
      }

      // Get user who is recording the entry
      const recordedByUser = await User.findById(userId);
      if (!recordedByUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Generate entry ID manually
      const entryId = await EmployeeEntry.generateEntryId();
      
      // Create employee entry
      const employeeEntry = new EmployeeEntry({
        entryId: entryId,
        employeeId: employee._id,
        buildingId: buildingId,
        recordedBy: userId,
        recordedByName: recordedByUser.name,
        purpose: purpose || '',
        notes: notes || ''
      });

      await employeeEntry.save();

      // Populate the entry for response
      await employeeEntry.populate([
        { path: 'employeeId', select: 'name employeeType employeeTypeDisplay phoneNumber employeeCode' },
        { path: 'buildingId', select: 'name address' },
        { path: 'recordedBy', select: 'name role' }
      ]);

      // Create the entry message
      const entryMessage = `${employee.name} (${employee.employeeTypeDisplay}) has entered the building`;

      res.status(201).json({
        success: true,
        message: entryMessage,
        data: {
          entry: {
            id: employeeEntry._id,
            entryId: employeeEntry.entryId,
            employeeName: employee.name,
            employeeType: employee.employeeType,
            employeeTypeDisplay: employee.employeeTypeDisplay,
            entryTime: employeeEntry.entryTime,
            entryTimeFormatted: employeeEntry.entryTimeFormatted,
            recordedByName: recordedByUser.name,
            purpose: employeeEntry.purpose,
            notes: employeeEntry.notes,
            buildingName: building.name
          }
        }
      });

    } catch (error) {
      console.error('Log employee entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to log employee entry',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get employee entries for a building
   * Access: SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
   */
  static async getEmployeeEntries(req, res) {
    try {
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
        page = 1, 
        limit = 50, 
        startDate, 
        endDate, 
        employeeType,
        today = false 
      } = req.query;

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

      let entries;
      let totalCount;

      if (today === 'true') {
        // Get today's entries
        entries = await EmployeeEntry.getTodaysEntries(buildingId);
        totalCount = entries.length;
      } else {
        // Get entries with filters
        const options = {
          page: parseInt(page),
          limit: parseInt(limit),
          startDate,
          endDate,
          employeeType
        };

        entries = await EmployeeEntry.getByBuilding(buildingId, options);
        
        // Get total count for pagination
        const countQuery = { buildingId, isActive: true };
        if (startDate || endDate) {
          countQuery.entryTime = {};
          if (startDate) countQuery.entryTime.$gte = new Date(startDate);
          if (endDate) countQuery.entryTime.$lte = new Date(endDate);
        }
        
        totalCount = await EmployeeEntry.countDocuments(countQuery);
      }

      // Filter by employee type if specified
      if (employeeType && today !== 'true') {
        entries = entries.filter(entry => 
          entry.employeeId && entry.employeeId.employeeType === employeeType
        );
      }

      const totalPages = Math.ceil(totalCount / limit);

      res.status(200).json({
        success: true,
        message: 'Employee entries retrieved successfully',
        data: {
          entries: entries.map(entry => ({
            id: entry._id,
            entryId: entry.entryId,
            employeeName: entry.employeeId?.name || 'Unknown Employee',
            employeeType: entry.employeeId?.employeeType || 'UNKNOWN',
            employeeTypeDisplay: entry.employeeId?.employeeTypeDisplay || 'Unknown Type',
            employeePhone: entry.employeeId?.phoneNumber || '',
            employeeCode: entry.employeeId?.employeeCode || '',
            entryTime: entry.entryTime,
            entryTimeFormatted: entry.entryTimeFormatted,
            entryMessage: entry.entryMessage,
            recordedByName: entry.recordedByName,
            recordedByRole: entry.recordedBy?.role || 'UNKNOWN',
            purpose: entry.purpose,
            notes: entry.notes,
            buildingName: entry.buildingId?.name || 'Unknown Building'
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          },
          building: {
            id: building._id,
            name: building.name,
            address: building.address
          }
        }
      });

    } catch (error) {
      console.error('Get employee entries error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee entries',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get available employees for entry tracking
   * Access: SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
   */
  static async getAvailableEmployees(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { buildingId } = req.params;
      const { employeeType } = req.query;

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

      // Build query for eligible employees
      const query = {
        buildingId: buildingId,
        isActive: true,
        employeeType: { $in: ['RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'] }
      };

      // Filter by specific employee type if provided
      if (employeeType && ['RESIDENT_HELPER', 'TECHNICIAN', 'OTHER'].includes(employeeType)) {
        query.employeeType = employeeType;
      }

      const employees = await Employee.find(query)
        .select('name phoneNumber employeeCode employeeType employeeTypeDisplay')
        .sort({ employeeType: 1, name: 1 });

      res.status(200).json({
        success: true,
        message: 'Available employees retrieved successfully',
        data: {
          employees: employees.map(employee => ({
            id: employee._id,
            name: employee.name,
            phoneNumber: employee.phoneNumber,
            employeeCode: employee.employeeCode,
            employeeType: employee.employeeType,
            employeeTypeDisplay: employee.employeeTypeDisplay,
            displayName: `${employee.name} (${employee.employeeTypeDisplay})`,
            dropdownText: `${employee.employeeCode || 'N/A'} - ${employee.name} - ${employee.employeeTypeDisplay}`
          })),
          building: {
            id: building._id,
            name: building.name,
            address: building.address
          },
          totalCount: employees.length
        }
      });

    } catch (error) {
      console.error('Get available employees error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available employees',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get employee entry statistics
   * Access: SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
   */
  static async getEntryStats(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { buildingId } = req.params;
      const { startDate, endDate } = req.query;

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

      const stats = await EmployeeEntry.getEntryStats(buildingId, startDate, endDate);
      const result = stats.length > 0 ? stats[0] : {
        totalEntries: 0,
        residentHelperEntries: 0,
        technicianEntries: 0,
        otherEntries: 0,
        todayEntries: 0
      };

      res.status(200).json({
        success: true,
        message: 'Employee entry statistics retrieved successfully',
        data: {
          statistics: result,
          building: {
            id: building._id,
            name: building.name,
            address: building.address
          }
        }
      });

    } catch (error) {
      console.error('Get entry stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve entry statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get employee entry by ID
   * Access: SECURITY, BUILDING_ADMIN, SUPER_ADMIN, RESIDENT
   */
  static async getEmployeeEntryById(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { buildingId, entryId } = req.params;

      // Validate building ID
      if (!mongoose.Types.ObjectId.isValid(buildingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid building ID format'
        });
      }

      const entry = await EmployeeEntry.findOne({
        _id: entryId,
        buildingId: buildingId,
        isActive: true
      })
        .populate('employeeId', 'name employeeType employeeTypeDisplay phoneNumber employeeCode')
        .populate('recordedBy', 'name role')
        .populate('buildingId', 'name address');

      if (!entry) {
        return res.status(404).json({
          success: false,
          message: 'Employee entry not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Employee entry retrieved successfully',
        data: {
          entry: {
            id: entry._id,
            entryId: entry.entryId,
            employeeName: entry.employeeId?.name || 'Unknown Employee',
            employeeType: entry.employeeId?.employeeType || 'UNKNOWN',
            employeeTypeDisplay: entry.employeeId?.employeeTypeDisplay || 'Unknown Type',
            employeePhone: entry.employeeId?.phoneNumber || '',
            employeeCode: entry.employeeId?.employeeCode || '',
            entryTime: entry.entryTime,
            entryTimeFormatted: entry.entryTimeFormatted,
            entryMessage: entry.entryMessage,
            recordedByName: entry.recordedByName,
            recordedByRole: entry.recordedBy?.role || 'UNKNOWN',
            purpose: entry.purpose,
            notes: entry.notes,
            buildingName: entry.buildingId?.name || 'Unknown Building',
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
          }
        }
      });

    } catch (error) {
      console.error('Get employee entry by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee entry',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = EmployeeEntryController;
