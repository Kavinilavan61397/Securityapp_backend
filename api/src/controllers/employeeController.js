const Employee = require('../models/Employee');
const Building = require('../models/Building');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Employee Controller
 * Handles all employee management operations for admin flow
 */
class EmployeeController {
  
  /**
   * Create a new employee
   * Only BUILDING_ADMIN and SUPER_ADMIN can create employees
   */
  static async createEmployee(req, res) {
    try {
      const { buildingId } = req.params;
      const { 
        name, 
        phoneNumber, 
        joiningDate, 
        employeeType, 
        canLogin = false,
        email,
        department,
        designation,
        workSchedule,
        emergencyContact,
        notes
      } = req.body;
      
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      if (role === 'BUILDING_ADMIN' && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only manage employees in your assigned building.'
        });
      }

      // Validate employee type based on canLogin flag
      if (canLogin && !['SECURITY_GUARD'].includes(employeeType)) {
        return res.status(400).json({
          success: false,
          message: 'Only Security Guards can have login access. Helper, technicians and others will not have the toggle.'
        });
      }

      // Create new employee
      const employee = new Employee({
        name,
        phoneNumber,
        joiningDate: new Date(joiningDate),
        employeeType,
        canLogin,
        email,
        department,
        designation,
        workSchedule,
        emergencyContact,
        notes,
        buildingId,
        createdBy: userId
      });

      await employee.save();

      // Populate building and creator details
      await employee.populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'createdBy', select: 'name email role' }
      ]);

      console.log('✅ Employee created successfully:', employee._id);

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: {
          employee: employee.getSummary(),
          building: {
            id: building._id,
            name: building.name
          },
          createdBy: {
            id: userId,
            name: req.user.name
          }
        }
      });

    } catch (error) {
      console.error('Create employee error:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Employee code already exists',
          error: 'Duplicate employee code'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create employee',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get all employees for a building with optional filtering
   */
  static async getEmployees(req, res) {
    try {
      const { buildingId } = req.params;
      const { employeeType, isActive = true, page = 1, limit = 10 } = req.query;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      if (role === 'BUILDING_ADMIN' && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view employees in your assigned building.'
        });
      }

      // Build query
      const query = { buildingId };
      
      if (employeeType) {
        query.employeeType = employeeType;
      }
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get employees with pagination
      const employees = await Employee.find(query)
        .populate([
          { path: 'buildingId', select: 'name address' },
          { path: 'createdBy', select: 'name email role' }
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const totalEmployees = await Employee.countDocuments(query);

      // Get employee type counts
      const typeCounts = await Employee.aggregate([
        { $match: { buildingId: new mongoose.Types.ObjectId(buildingId), isActive: true } },
        { $group: { _id: '$employeeType', count: { $sum: 1 } } }
      ]);

      const typeCountMap = {};
      typeCounts.forEach(item => {
        typeCountMap[item._id] = item.count;
      });

      res.status(200).json({
        success: true,
        message: 'Employees retrieved successfully',
        data: {
          employees: employees.map(emp => emp.getSummary()),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalEmployees / parseInt(limit)),
            totalEmployees,
            hasNext: skip + employees.length < totalEmployees,
            hasPrev: parseInt(page) > 1
          },
          typeCounts: {
            SECURITY_GUARD: typeCountMap.SECURITY_GUARD || 0,
            RESIDENT_HELPER: typeCountMap.RESIDENT_HELPER || 0,
            TECHNICIAN: typeCountMap.TECHNICIAN || 0,
            OTHER: typeCountMap.OTHER || 0,
            TOTAL: totalEmployees
          },
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employees',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get single employee by ID
   */
  static async getEmployeeById(req, res) {
    try {
      const { buildingId, employeeId } = req.params;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      if (role === 'BUILDING_ADMIN' && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view employees in your assigned building.'
        });
      }

      // Get employee
      const employee = await Employee.findOne({ 
        _id: employeeId, 
        buildingId 
      }).populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'createdBy', select: 'name email role' }
      ]);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Employee retrieved successfully',
        data: {
          employee: employee.getSummary(),
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Get employee by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update employee details
   */
  static async updateEmployee(req, res) {
    try {
      const { buildingId, employeeId } = req.params;
      const { 
        name, 
        phoneNumber, 
        joiningDate, 
        employeeType, 
        canLogin,
        email,
        department,
        designation,
        workSchedule,
        emergencyContact,
        notes
      } = req.body;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      if (role === 'BUILDING_ADMIN' && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update employees in your assigned building.'
        });
      }

      // Get employee
      const employee = await Employee.findOne({ 
        _id: employeeId, 
        buildingId 
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Validate employee type based on canLogin flag
      if (canLogin && !['SECURITY_GUARD'].includes(employeeType)) {
        return res.status(400).json({
          success: false,
          message: 'Only Security Guards can have login access. Helper, technicians and others will not have the toggle.'
        });
      }

      // Update employee
      const updateData = {};
      if (name) updateData.name = name;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (joiningDate) updateData.joiningDate = new Date(joiningDate);
      if (employeeType) updateData.employeeType = employeeType;
      if (canLogin !== undefined) updateData.canLogin = canLogin;
      if (email !== undefined) updateData.email = email;
      if (department !== undefined) updateData.department = department;
      if (designation !== undefined) updateData.designation = designation;
      if (workSchedule !== undefined) updateData.workSchedule = workSchedule;
      if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
      if (notes !== undefined) updateData.notes = notes;

      const updatedEmployee = await Employee.findByIdAndUpdate(
        employeeId,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'buildingId', select: 'name address' },
        { path: 'createdBy', select: 'name email role' }
      ]);

      console.log('✅ Employee updated successfully:', updatedEmployee._id);

      res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: {
          employee: updatedEmployee.getSummary(),
          building: {
            id: building._id,
            name: building.name
          }
        }
      });

    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update employee',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Delete employee (soft delete)
   */
  static async deleteEmployee(req, res) {
    try {
      const { buildingId, employeeId } = req.params;
      const { userId, role } = req.user;

      // Verify building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Check permissions
      if (role === 'BUILDING_ADMIN' && building.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete employees in your assigned building.'
        });
      }

      // Get employee
      const employee = await Employee.findOne({ 
        _id: employeeId, 
        buildingId 
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Soft delete employee
      employee.isActive = false;
      employee.deletedAt = new Date();
      employee.deletedBy = userId;
      await employee.save();

      console.log('✅ Employee deleted successfully:', employee._id);

      res.status(200).json({
        success: true,
        message: 'Employee deleted successfully',
        data: {
          employeeId: employee._id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          deletedAt: employee.deletedAt
        }
      });

    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete employee',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get employee categories
   */
  static async getEmployeeCategories(req, res) {
    try {
      const categories = [
        {
          value: 'SECURITY_GUARD',
          label: 'Security Guards',
          description: 'Security personnel and guards',
          canLogin: true,
          icon: 'shield'
        },
        {
          value: 'RESIDENT_HELPER',
          label: 'Resident Helpers',
          description: 'Helpers and assistants for residents',
          canLogin: false,
          icon: 'briefcase'
        },
        {
          value: 'TECHNICIAN',
          label: 'Technicians',
          description: 'Technical staff and maintenance workers',
          canLogin: false,
          icon: 'hard-hat'
        },
        {
          value: 'OTHER',
          label: 'Others',
          description: 'Other types of employees',
          canLogin: false,
          icon: 'person'
        }
      ];

      res.status(200).json({
        success: true,
        message: 'Employee categories retrieved successfully',
        data: {
          categories
        }
      });

    } catch (error) {
      console.error('Get employee categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee categories',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Generate new employee code
   */
  static async generateEmployeeCode(req, res) {
    try {
      const employeeCode = await Employee.generateEmployeeCode();
      
      res.status(200).json({
        success: true,
        message: 'Employee code generated successfully',
        data: {
          employeeCode
        }
      });

    } catch (error) {
      console.error('Generate employee code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate employee code',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = EmployeeController;
