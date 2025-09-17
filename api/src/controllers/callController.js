const User = require('../models/User');
const Visit = require('../models/Visit');

/**
 * Call Controller
 * Handles calling residents and visitor-related communication
 */
class CallController {

  /**
   * Get resident contact information
   * GET /api/calls/resident/:buildingId/:residentId
   */
  static async getResidentContact(req, res) {
    try {
      const { buildingId, residentId } = req.params;

      const resident = await User.findOne({
        _id: residentId,
        buildingId,
        role: 'RESIDENT',
        isActive: true
      }).select('name phoneNumber flatNumber email');

      if (!resident) {
        return res.status(404).json({
          success: false,
          message: 'Resident not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          resident: {
            id: resident._id,
            name: resident.name,
            phoneNumber: resident.phoneNumber,
            flatNumber: resident.flatNumber,
            email: resident.email
          }
        }
      });

    } catch (error) {
      console.error('Get resident contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get resident by flat number
   * GET /api/calls/resident-by-flat/:buildingId/:flatNumber
   */
  static async getResidentByFlat(req, res) {
    try {
      const { buildingId, flatNumber } = req.params;

      const resident = await User.findOne({
        buildingId,
        flatNumber,
        role: 'RESIDENT',
        isActive: true
      }).select('name phoneNumber flatNumber email');

      if (!resident) {
        return res.status(404).json({
          success: false,
          message: 'No resident found for this flat number'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          resident: {
            id: resident._id,
            name: resident.name,
            phoneNumber: resident.phoneNumber,
            flatNumber: resident.flatNumber,
            email: resident.email
          }
        }
      });

    } catch (error) {
      console.error('Get resident by flat error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get visitor's host contact information
   * GET /api/calls/visitor-host/:buildingId/:visitId
   */
  static async getVisitorHostContact(req, res) {
    try {
      const { buildingId, visitId } = req.params;

      const visit = await Visit.findOne({
        _id: visitId,
        buildingId,
        isActive: true
      })
      .populate('hostId', 'name phoneNumber flatNumber email')
      .populate('visitorId', 'name phoneNumber visitorCategory serviceType');

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          visit: {
            visitId: visit.visitId,
            purpose: visit.purpose,
            scheduledDate: visit.scheduledDate,
            scheduledTime: visit.scheduledTime,
            status: visit.status
          },
          visitor: {
            name: visit.visitorId.name,
            phoneNumber: visit.visitorId.phoneNumber,
            category: visit.visitorId.visitorCategory,
            serviceType: visit.visitorId.serviceType
          },
          host: {
            id: visit.hostId._id,
            name: visit.hostId.name,
            phoneNumber: visit.hostId.phoneNumber,
            flatNumber: visit.hostId.flatNumber,
            email: visit.hostId.email
          }
        }
      });

    } catch (error) {
      console.error('Get visitor host contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Search residents by name or flat number
   * GET /api/calls/search-residents/:buildingId
   */
  static async searchResidents(req, res) {
    try {
      const { buildingId } = req.params;
      const { query, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const residents = await User.find({
        buildingId,
        role: 'RESIDENT',
        isActive: true,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { flatNumber: { $regex: query, $options: 'i' } }
        ]
      })
      .select('name phoneNumber flatNumber email')
      .limit(parseInt(limit))
      .sort({ name: 1 });

      res.status(200).json({
        success: true,
        data: {
          residents: residents.map(resident => ({
            id: resident._id,
            name: resident.name,
            phoneNumber: resident.phoneNumber,
            flatNumber: resident.flatNumber,
            email: resident.email
          })),
          total: residents.length
        }
      });

    } catch (error) {
      console.error('Search residents error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get building admin contact
   * GET /api/calls/building-admin/:buildingId
   */
  static async getBuildingAdminContact(req, res) {
    try {
      const { buildingId } = req.params;

      const admin = await User.findOne({
        buildingId,
        role: 'BUILDING_ADMIN',
        isActive: true
      }).select('name phoneNumber email');

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Building administrator not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          admin: {
            id: admin._id,
            name: admin.name,
            phoneNumber: admin.phoneNumber,
            email: admin.email
          }
        }
      });

    } catch (error) {
      console.error('Get building admin contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = CallController;
