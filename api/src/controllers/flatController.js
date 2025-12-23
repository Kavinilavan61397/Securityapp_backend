const Flat = require('../models/Flat');
const Building = require('../models/Building');

// Create a new flat
const createFlat = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id || req.user.userId;
    const { name, flatNumber, blockNumber, relation, age, phoneNumber } = req.body;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Check if flat already exists for this resident
    const existingFlat = await Flat.findOne({
      residentId: userId,
      buildingId,
      flatNumber,
      isDeleted: false
    });

    if (existingFlat) {
      return res.status(400).json({
        success: false,
        message: 'Flat already exists for this resident'
      });
    }

    // Create new flat
    const flat = new Flat({
      name,
      flatNumber,
      blockNumber,
      relation,
      age,
      phoneNumber,
      residentId: userId,
      buildingId
    });

    await flat.save();

    res.status(201).json({
      success: true,
      message: 'Flat added successfully',
      data: {
        flatId: flat._id,
        name: flat.name,
        flatNumber: flat.flatNumber,
        blockNumber: flat.blockNumber,
        relation: flat.relation,
        age: flat.age,
        phoneNumber: flat.phoneNumber,
        fullIdentification: flat.fullIdentification,
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
    console.error('Create flat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add flat',
      error: error.message
    });
  }
};

// Get all flats for a resident
const getFlats = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id || req.user.userId;

    const flats = await Flat.find({
      residentId: userId,
      buildingId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Flats retrieved successfully',
      data: {
        flats: flats.map(flat => ({
          _id: flat._id,
          name: flat.name,
          flatNumber: flat.flatNumber,
          blockNumber: flat.blockNumber,
          relation: flat.relation,
          age: flat.age,
          phoneNumber: flat.phoneNumber,
          fullIdentification: flat.fullIdentification,
          isActive: flat.isActive,
          createdAt: flat.createdAt,
          updatedAt: flat.updatedAt
        })),
        totalCount: flats.length
      }
    });

  } catch (error) {
    console.error('Get flats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve flats',
      error: error.message
    });
  }
};

// Delete a flat
const deleteFlat = async (req, res) => {
  try {
    const { buildingId, flatId } = req.params;
    const userId = req.user.id || req.user.userId;

    const flat = await Flat.findOne({
      _id: flatId,
      residentId: userId,
      buildingId,
      isDeleted: false
    });

    if (!flat) {
      return res.status(404).json({
        success: false,
        message: 'Flat not found or access denied'
      });
    }

    // Soft delete
    flat.isDeleted = true;
    flat.deletedAt = new Date();
    flat.deletedBy = userId;
    await flat.save();

    res.json({
      success: true,
      message: 'Flat deleted successfully',
      data: {
        flatId: flat._id,
        name: flat.name,
        flatNumber: flat.flatNumber,
        deletedAt: flat.deletedAt
      }
    });

  } catch (error) {
    console.error('Delete flat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete flat',
      error: error.message
    });
  }
};

module.exports = {
  createFlat,
  getFlats,
  deleteFlat
};
