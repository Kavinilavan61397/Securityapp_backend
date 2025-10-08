const Notice = require('../models/Notice');
const Building = require('../models/Building');

/**
 * Create a new Notice
 * Accessible by: RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
 */
const createNotice = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id || req.user.userId;
    const { title, message, status } = req.body;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Create new notice
    const notice = new Notice({
      title,
      message,
      status: status || 'OPEN',
      buildingId,
      createdBy: userId
    });

    await notice.save();

    // Populate creator details
    await notice.populate('createdBy', 'name email role flatNumber');
    await notice.populate('buildingId', 'name');

    console.log('✅ Notice created successfully:', notice._id);

    res.status(201).json({
      success: true,
      message: 'Notice posted successfully',
      data: {
        noticeId: notice._id,
        title: notice.title,
        message: notice.message,
        status: notice.status,
        createdBy: {
          id: notice.createdBy._id,
          name: notice.createdBy.name,
          role: notice.createdBy.role,
          flatNumber: notice.createdBy.flatNumber
        },
        building: {
          id: building._id,
          name: building.name
        },
        createdAt: notice.createdAt
      }
    });

  } catch (error) {
    console.error('Create Notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post notice',
      error: error.message
    });
  }
};

/**
 * Get all Notices for a building
 * Accessible by: All roles (RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN)
 */
const getNotices = async (req, res) => {
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

    // Get all notices for the building (newest first, no pagination)
    const notices = await Notice.find({
      buildingId,
      isDeleted: false
    })
    .populate('createdBy', 'name email role flatNumber phoneNumber')
    .populate('buildingId', 'name')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Notices retrieved successfully',
      data: {
        notices: notices.map(notice => ({
          _id: notice._id,
          title: notice.title,
          message: notice.message,
          status: notice.status,
          createdBy: notice.createdBy ? {
            id: notice.createdBy._id,
            name: notice.createdBy.name,
            role: notice.createdBy.role,
            flatNumber: notice.createdBy.flatNumber,
            phoneNumber: notice.createdBy.phoneNumber
          } : null,
          createdAt: notice.createdAt,
          updatedAt: notice.updatedAt
        })),
        totalCount: notices.length,
        building: {
          id: building._id,
          name: building.name
        }
      }
    });

  } catch (error) {
    console.error('Get Notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notices',
      error: error.message
    });
  }
};

/**
 * Get single Notice
 * Accessible by: All roles
 */
const getNoticeById = async (req, res) => {
  try {
    const { buildingId, noticeId } = req.params;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Find notice
    const notice = await Notice.findOne({
      _id: noticeId,
      buildingId,
      isDeleted: false
    })
    .populate('createdBy', 'name email role flatNumber phoneNumber')
    .populate('buildingId', 'name');

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    res.json({
      success: true,
      message: 'Notice retrieved successfully',
      data: {
        _id: notice._id,
        title: notice.title,
        message: notice.message,
        status: notice.status,
        createdBy: notice.createdBy ? {
          id: notice.createdBy._id,
          name: notice.createdBy.name,
          role: notice.createdBy.role,
          flatNumber: notice.createdBy.flatNumber,
          phoneNumber: notice.createdBy.phoneNumber
        } : null,
        building: {
          id: building._id,
          name: building.name
        },
        createdAt: notice.createdAt,
        updatedAt: notice.updatedAt
      }
    });

  } catch (error) {
    console.error('Get Notice by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notice',
      error: error.message
    });
  }
};

/**
 * Update Notice
 * Accessible by: RESIDENT, SECURITY, BUILDING_ADMIN, SUPER_ADMIN
 */
const updateNotice = async (req, res) => {
  try {
    const { buildingId, noticeId } = req.params;
    const userId = req.user.id || req.user.userId;
    const { title, message, status } = req.body;

    // Verify building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Building not found'
      });
    }

    // Find notice
    const notice = await Notice.findOne({
      _id: noticeId,
      buildingId,
      isDeleted: false
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Update fields
    if (title !== undefined) notice.title = title;
    if (message !== undefined) notice.message = message;
    if (status !== undefined) notice.status = status;

    await notice.save();

    // Populate details
    await notice.populate('createdBy', 'name email role flatNumber');
    await notice.populate('buildingId', 'name');

    console.log('✅ Notice updated successfully:', notice._id, 'by', userId);

    res.json({
      success: true,
      message: 'Notice updated successfully',
      data: {
        _id: notice._id,
        title: notice.title,
        message: notice.message,
        status: notice.status,
        createdBy: notice.createdBy ? {
          id: notice.createdBy._id,
          name: notice.createdBy.name,
          role: notice.createdBy.role,
          flatNumber: notice.createdBy.flatNumber
        } : null,
        building: {
          id: building._id,
          name: building.name
        },
        createdAt: notice.createdAt,
        updatedAt: notice.updatedAt
      }
    });

  } catch (error) {
    console.error('Update Notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notice',
      error: error.message
    });
  }
};

/**
 * Delete Notice
 * Accessible by: All roles (anyone can delete)
 */
const deleteNotice = async (req, res) => {
  try {
    const { buildingId, noticeId } = req.params;
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

    // Find notice
    const notice = await Notice.findOne({
      _id: noticeId,
      buildingId,
      isDeleted: false
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Soft delete
    notice.isDeleted = true;
    notice.deletedAt = new Date();
    notice.deletedBy = userId;
    await notice.save();

    console.log('✅ Notice deleted successfully:', notice._id, 'by', userRole, userId);

    res.json({
      success: true,
      message: 'Notice deleted successfully',
      data: {
        noticeId: notice._id,
        title: notice.title,
        deletedAt: notice.deletedAt,
        deletedBy: {
          id: userId,
          name: req.user.name,
          role: userRole
        }
      }
    });

  } catch (error) {
    console.error('Delete Notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notice',
      error: error.message
    });
  }
};

module.exports = {
  createNotice,
  getNotices,
  getNoticeById,
  updateNotice,
  deleteNotice
};
