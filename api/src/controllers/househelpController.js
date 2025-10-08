const Househelp = require('../models/Househelp');
const Building = require('../models/Building');

// Create a new househelp
const createHousehelp = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id || req.user.userId;
    const { name, occupation, visitingTime } = req.body;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Create new househelp
    const househelp = new Househelp({
      name,
      occupation,
      visitingTime,
      residentId: userId,
      buildingId
    });

    await househelp.save();

    res.status(201).json({
      success: true,
      message: 'Househelp added successfully',
      data: {
        househelpId: househelp._id,
        name: househelp.name,
        occupation: househelp.occupation,
        visitingTime: househelp.visitingTime,
        fullIdentification: househelp.fullIdentification,
        resident: {
          id: userId,
          name: req.user.name || 'Resident'
        },
        building: {
          id: buildingId,
          name: building.name
        }
      }
    });

  } catch (error) {
    console.error('Create househelp error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add househelp',
      error: error.message
    });
  }
};

// Get all househelp for a building (building-wide access)
const getHousehelp = async (req, res) => {
  try {
    const { buildingId } = req.params;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Get all househelp for the building (not user-specific)
    const househelpList = await Househelp.find({
      buildingId,
      isDeleted: false
    })
    .populate('residentId', 'name phoneNumber flatNumber')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Househelp retrieved successfully',
      data: {
        househelp: househelpList.map(househelp => ({
          _id: househelp._id,
          name: househelp.name,
          occupation: househelp.occupation,
          visitingTime: househelp.visitingTime,
          fullIdentification: househelp.fullIdentification,
          isActive: househelp.isActive,
          createdBy: househelp.residentId ? {
            id: househelp.residentId._id,
            name: househelp.residentId.name,
            flatNumber: househelp.residentId.flatNumber
          } : null,
          createdAt: househelp.createdAt,
          updatedAt: househelp.updatedAt
        })),
        totalCount: househelpList.length,
        building: {
          id: building._id,
          name: building.name
        }
      }
    });

  } catch (error) {
    console.error('Get househelp error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve househelp',
      error: error.message
    });
  }
};

// Delete a househelp (SECURITY, admins, or creator only)
const deleteHousehelp = async (req, res) => {
  try {
    const { buildingId, househelpId } = req.params;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Find househelp
    const househelp = await Househelp.findOne({
      _id: househelpId,
      buildingId,
      isDeleted: false
    });

    if (!househelp) {
      return res.status(404).json({
        success: false,
        message: 'Househelp not found'
      });
    }

    // Check permissions: SECURITY, BUILDING_ADMIN, SUPER_ADMIN, or creator
    const isCreator = househelp.residentId && househelp.residentId.toString() === userId;
    const isAuthorized = ['SECURITY', 'BUILDING_ADMIN', 'SUPER_ADMIN'].includes(userRole);

    if (!isCreator && !isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only SECURITY, admins, or the creator can delete this househelp.'
      });
    }

    // Soft delete
    househelp.isDeleted = true;
    househelp.deletedAt = new Date();
    househelp.deletedBy = userId;
    await househelp.save();

    console.log('✅ Househelp deleted successfully:', househelp._id, 'by', userRole, userId);

    res.json({
      success: true,
      message: 'Househelp deleted successfully',
      data: {
        househelpId: househelp._id,
        name: househelp.name,
        occupation: househelp.occupation,
        deletedAt: househelp.deletedAt,
        deletedBy: {
          id: userId,
          name: req.user.name,
          role: userRole
        }
      }
    });

  } catch (error) {
    console.error('Delete househelp error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete househelp',
      error: error.message
    });
  }
};

module.exports = {
  createHousehelp,
  getHousehelp,
  deleteHousehelp
};
