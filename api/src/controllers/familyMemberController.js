const FamilyMember = require('../models/FamilyMember');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Family Member Controller
 * Handles CRUD operations for family members
 * Follows minimal mandatory fields approach
 */
class FamilyMemberController {

  /**
   * Create Family Member
   * POST /api/family-members/:buildingId
   */
  async createFamilyMember(req, res) {
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

      const { buildingId } = req.params;
      const { name, phoneNumber, relation, email, dateOfBirth, age, gender, address, city, pincode, occupation, emergencyContact, notes } = req.body;
      const residentId = req.user.userId;

      // Verify resident exists and belongs to building
      const resident = await User.findOne({
        _id: residentId,
        buildingId: buildingId,
        role: 'RESIDENT',
        isActive: true
      });

      if (!resident) {
        return res.status(404).json({
          success: false,
          message: 'Resident not found or not authorized for this building'
        });
      }

      // Check if family member with same phone number already exists for this resident
      const existingMember = await FamilyMember.findOne({
        residentId: residentId,
        phoneNumber: phoneNumber,
        isActive: true
      });

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'Family member with this phone number already exists'
        });
      }

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

      // Create family member
      const familyMember = new FamilyMember({
        residentId,
        buildingId,
        name,
        phoneNumber,
        relation,
        email,
        dateOfBirth: formattedDateOfBirth,
        age,
        gender,
        address,
        city,
        pincode,
        occupation,
        emergencyContact: emergencyContact || false,
        notes
      });

      await familyMember.save();

      res.status(201).json({
        success: true,
        message: 'Family member added successfully',
        data: {
          id: familyMember._id,
          name: familyMember.name,
          phoneNumber: familyMember.phoneNumber,
          relation: familyMember.relation,
          relationDisplay: familyMember.relationDisplay,
          email: familyMember.email,
          dateOfBirth: familyMember.dateOfBirth,
          age: familyMember.age,
          gender: familyMember.gender,
          address: familyMember.address,
          city: familyMember.city,
          pincode: familyMember.pincode,
          occupation: familyMember.occupation,
          emergencyContact: familyMember.emergencyContact,
          notes: familyMember.notes,
          createdAt: familyMember.createdAt
        }
      });

    } catch (error) {
      console.error('Create family member error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get Family Members
   * GET /api/family-members/:buildingId
   */
  async getFamilyMembers(req, res) {
    try {
      const { buildingId } = req.params;
      const residentId = req.user.userId;
      const { relation, page = 1, limit = 20 } = req.query;

      // Verify resident exists and belongs to building
      const resident = await User.findOne({
        _id: residentId,
        buildingId: buildingId,
        role: 'RESIDENT',
        isActive: true
      });

      if (!resident) {
        return res.status(404).json({
          success: false,
          message: 'Resident not found or not authorized for this building'
        });
      }

      // Build query
      const query = {
        residentId: residentId,
        buildingId: buildingId,
        isActive: true
      };

      if (relation) {
        query.relation = relation;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get family members
      const familyMembers = await FamilyMember.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const totalCount = await FamilyMember.countDocuments(query);

      res.status(200).json({
        success: true,
        message: 'Family members retrieved successfully',
        data: {
          familyMembers: familyMembers.map(member => ({
            id: member._id,
            name: member.name,
            phoneNumber: member.phoneNumber,
            relation: member.relation,
            relationDisplay: member.relationDisplay,
            email: member.email,
            dateOfBirth: member.dateOfBirth,
            age: member.age,
            gender: member.gender,
            address: member.address,
            city: member.city,
            pincode: member.pincode,
            occupation: member.occupation,
            emergencyContact: member.emergencyContact,
            notes: member.notes,
            createdAt: member.createdAt
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount: totalCount,
            hasNextPage: skip + familyMembers.length < totalCount,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Get family members error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get Single Family Member
   * GET /api/family-members/:buildingId/:memberId
   */
  async getFamilyMember(req, res) {
    try {
      const { buildingId, memberId } = req.params;
      const residentId = req.user.userId;

      // Find family member
      const familyMember = await FamilyMember.findOne({
        _id: memberId,
        residentId: residentId,
        buildingId: buildingId,
        isActive: true
      });

      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'Family member not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Family member retrieved successfully',
        data: {
          id: familyMember._id,
          name: familyMember.name,
          phoneNumber: familyMember.phoneNumber,
          relation: familyMember.relation,
          relationDisplay: familyMember.relationDisplay,
          email: familyMember.email,
          dateOfBirth: familyMember.dateOfBirth,
          age: familyMember.age,
          gender: familyMember.gender,
          address: familyMember.address,
          city: familyMember.city,
          pincode: familyMember.pincode,
          occupation: familyMember.occupation,
          emergencyContact: familyMember.emergencyContact,
          notes: familyMember.notes,
          createdAt: familyMember.createdAt,
          updatedAt: familyMember.updatedAt
        }
      });

    } catch (error) {
      console.error('Get family member error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update Family Member
   * PUT /api/family-members/:buildingId/:memberId
   */
  async updateFamilyMember(req, res) {
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

      const { buildingId, memberId } = req.params;
      const { name, phoneNumber, relation, email, dateOfBirth, age, gender, address, city, pincode, occupation, emergencyContact, notes } = req.body;
      const residentId = req.user.userId;

      // Find family member
      const familyMember = await FamilyMember.findOne({
        _id: memberId,
        residentId: residentId,
        buildingId: buildingId,
        isActive: true
      });

      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'Family member not found'
        });
      }

      // Check if phone number is being changed and if it conflicts with another member
      if (phoneNumber && phoneNumber !== familyMember.phoneNumber) {
        const existingMember = await FamilyMember.findOne({
          residentId: residentId,
          phoneNumber: phoneNumber,
          _id: { $ne: memberId },
          isActive: true
        });

        if (existingMember) {
          return res.status(400).json({
            success: false,
            message: 'Family member with this phone number already exists'
          });
        }
      }

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

      // Update family member
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (relation !== undefined) updateData.relation = relation;
      if (email !== undefined) updateData.email = email;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = formattedDateOfBirth;
      if (age !== undefined) updateData.age = age;
      if (gender !== undefined) updateData.gender = gender;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (pincode !== undefined) updateData.pincode = pincode;
      if (occupation !== undefined) updateData.occupation = occupation;
      if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
      if (notes !== undefined) updateData.notes = notes;

      const updatedMember = await FamilyMember.findByIdAndUpdate(
        memberId,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Family member updated successfully',
        data: {
          id: updatedMember._id,
          name: updatedMember.name,
          phoneNumber: updatedMember.phoneNumber,
          relation: updatedMember.relation,
          relationDisplay: updatedMember.relationDisplay,
          email: updatedMember.email,
          dateOfBirth: updatedMember.dateOfBirth,
          age: updatedMember.age,
          gender: updatedMember.gender,
          address: updatedMember.address,
          city: updatedMember.city,
          pincode: updatedMember.pincode,
          occupation: updatedMember.occupation,
          emergencyContact: updatedMember.emergencyContact,
          notes: updatedMember.notes,
          createdAt: updatedMember.createdAt,
          updatedAt: updatedMember.updatedAt
        }
      });

    } catch (error) {
      console.error('Update family member error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Delete Family Member
   * DELETE /api/family-members/:buildingId/:memberId
   */
  async deleteFamilyMember(req, res) {
    try {
      const { buildingId, memberId } = req.params;
      const residentId = req.user.userId;

      // Find family member
      const familyMember = await FamilyMember.findOne({
        _id: memberId,
        residentId: residentId,
        buildingId: buildingId,
        isActive: true
      });

      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'Family member not found'
        });
      }

      // Soft delete (set isActive to false)
      familyMember.isActive = false;
      await familyMember.save();

      res.status(200).json({
        success: true,
        message: 'Family member deleted successfully'
      });

    } catch (error) {
      console.error('Delete family member error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = new FamilyMemberController();
