// Visit controller for pre-approval automation
const Visit = require('../models/Visit');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Building = require('../models/Building');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const mongoose = require('mongoose');

class VisitController {
  /**
   * Create a new visit
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createVisit(req, res) {
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
        visitorId,
        hostId,
        hostFlatNumber,
        blockNumber,
        purpose,
        visitType = 'WALK_IN',
        scheduledDate,
        scheduledTime,
        expectedDuration,
        vehicleNumber,
        vehicleType = 'OTHER'
      } = req.body;

      // Validate building exists
      const building = await Building.findById(buildingId);
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Building not found'
        });
      }

      // Validate visitor exists and belongs to building
      const visitor = await Visitor.findById(visitorId);
      if (!visitor || visitor.buildingId.toString() !== buildingId) {
        return res.status(404).json({
          success: false,
          message: 'Visitor not found or does not belong to this building'
        });
      }

      // Validate host exists and belongs to building (only if hostId is provided)
      let host = null;
      if (hostId) {
        host = await User.findById(hostId);
        if (!host || host.buildingId.toString() !== buildingId) {
          return res.status(404).json({
            success: false,
            message: 'Host not found or does not belong to this building'
          });
        }
      }

      // Generate unique visit ID
      const visitId = `VISIT_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Generate QR code data
      const qrData = {
        visitId,
        visitorId: visitor._id.toString(),
        visitorName: visitor.name,
        buildingId,
        timestamp: Date.now()
      };

      // Generate QR code (encrypted)
      const qrCode = crypto.createHash('sha256')
        .update(JSON.stringify(qrData))
        .digest('hex');

      // Set QR code expiration (24 hours from now)
      const qrCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create visit
      const visitData = {
        visitId,
        visitorId,
        buildingId,
        hostFlatNumber,
        blockNumber,
        purpose,
        visitType,
        approvalStatus: visitType === 'PRE_APPROVED' ? 'APPROVED' : 'PENDING',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        scheduledTime,
        expectedDuration,
        qrCode,
        qrCodeExpiresAt,
        vehicleNumber,
        vehicleType,
        status: visitType === 'PRE_APPROVED' ? 'SCHEDULED' : 'SCHEDULED'
      };

      // Only add hostId if provided
      if (hostId) {
        visitData.hostId = hostId;
      }

      const visit = new Visit(visitData);

      await visit.save();

      // Update visitor's visit count
      await Visitor.findByIdAndUpdate(visitorId, {
        $inc: { totalVisits: 1 },
        lastVisitAt: new Date()
      });

      // Create notification for host (only if hostId is provided)
      if (visitType !== 'PRE_APPROVED' && hostId && host) {
        try {
          await Notification.create({
            notificationId: `NOTIF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
            recipientId: hostId,
            recipientRole: host.role || 'RESIDENT',
            buildingId,
            title: 'New Visit Request',
            message: `${visitor.name} has requested to visit you`,
            type: 'VISIT_APPROVAL_REQUEST',
            category: 'INFO',
            priority: 'MEDIUM',
            relatedVisitId: visit._id,
            relatedVisitorId: visitorId,
            actionRequired: true,
            actionType: 'APPROVE',
            deliveryChannels: { inApp: true, email: true, sms: false }
          });
          
          // Update notification status
          visit.notificationsSent.host = true;
          await visit.save();
        } catch (notificationError) {
          console.error('Host notification creation failed:', notificationError);
          // Continue even if notification fails
        }
      }

      res.status(201).json({
        success: true,
        message: 'Visit created successfully',
        data: {
          visit: await visit.populate([
            { path: 'visitorId', select: 'name phoneNumber email' },
            { path: 'hostId', select: 'name phoneNumber email' }
          ])
        }
      });

    } catch (error) {
      console.error('Create visit error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all visits for a building with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getVisits(req, res) {
    try {
      const { buildingId } = req.params;
      const {
        page = 1,
        limit = 10,
        status,
        visitType,
        approvalStatus,
        startDate,
        endDate,
        hostId,
        visitorId
      } = req.query;

      const skip = (page - 1) * limit;
      const query = { buildingId };

      // Apply filters
      if (status) query.status = status;
      if (visitType) query.visitType = visitType;
      if (approvalStatus) query.approvalStatus = approvalStatus;
      if (hostId) query.hostId = hostId;
      if (visitorId) query.visitorId = visitorId;

      // Date range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const visits = await Visit.find(query)
        .populate([
          { 
            path: 'visitorId', 
            select: 'name phoneNumber email visitorCategory serviceType employeeCode flatNumbers vehicleNumber vehicleType'
          },
          { path: 'hostId', select: 'name phoneNumber email' },
          { path: 'approvedBy', select: 'name' },
          { path: 'verifiedBySecurity', select: 'name' }
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalVisits = await Visit.countDocuments(query);
      const totalPages = Math.ceil(totalVisits / limit);

      res.status(200).json({
        success: true,
        message: 'Visits retrieved successfully',
        data: {
          visits,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalVisits,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get visits error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get visit by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getVisitById(req, res) {
    try {
      const { buildingId, visitId } = req.params;

      // Handle both MongoDB ObjectId and custom visit ID
      const query = { buildingId };
      if (mongoose.Types.ObjectId.isValid(visitId)) {
        query._id = visitId;
      } else {
        query.visitId = visitId;
      }

      const visit = await Visit.findOne(query)
        .populate([
          { path: 'visitorId', select: 'name phoneNumber email photo idType idNumber' },
          { path: 'hostId', select: 'name phoneNumber email flatNumber' },
          { path: 'approvedBy', select: 'name' },
          { path: 'verifiedBySecurity', select: 'name' },
          { path: 'entryPhoto', select: 'url thumbnail' },
          { path: 'exitPhoto', select: 'url thumbnail' }
        ]);

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Visit retrieved successfully',
        data: { visit }
      });

    } catch (error) {
      console.error('Get visit by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Approve visit by resident name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async approveVisitByName(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { buildingId, visitId } = req.params;
      const { approvedByName } = req.body;
      const { userId, role } = req.user;

      // Find the visit
      const visit = await Visit.findOne({
        $or: [
          { _id: visitId },
          { visitId: visitId }
        ],
        buildingId,
        isActive: true
      });

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found'
        });
      }

      // Check if visit is in pending status
      if (visit.approvalStatus !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Visit is not in pending status for approval'
        });
      }

      // Approve the visit by name
      await visit.approveByName(approvedByName);

      // Populate the updated visit
      await visit.populate([
        { path: 'visitorId', select: 'name phoneNumber email' },
        { path: 'hostId', select: 'name flatNumber' }
      ]);

      console.log('✅ Visit approved by name:', approvedByName, 'for visit:', visit.visitId);

      res.status(200).json({
        success: true,
        message: 'Visit approved successfully',
        data: {
          visit: {
            visitId: visit.visitId,
            approvalStatus: visit.approvalStatus,
            approvedByName: visit.approvedByName,
            approvedAt: visit.approvedAt,
            status: visit.status,
            visitor: visit.visitorId,
            host: visit.hostId
          }
        }
      });

    } catch (error) {
      console.error('Approve visit by name error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve visit',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Update visit (approve/reject/cancel)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateVisit(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { buildingId, visitId } = req.params;
      const { approvalStatus, rejectionReason, securityNotes } = req.body;
      const { userId, role } = req.user;

      // Handle both MongoDB ObjectId and custom visit ID
      const query = { buildingId };
      if (mongoose.Types.ObjectId.isValid(visitId)) {
        query._id = visitId;
      } else {
        query.visitId = visitId;
      }

      const visit = await Visit.findOne(query)
        .populate([
          { path: 'visitorId', select: 'name phoneNumber email' },
          { path: 'hostId', select: 'name phoneNumber email role' }
        ]);

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found'
        });
      }

      // Check permissions
      if (role === 'SECURITY') {
        // Security can approve/reject visits and add notes
        if (approvalStatus) {
          if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(approvalStatus)) {
            return res.status(400).json({
              success: false,
              message: 'Invalid approval status'
            });
          }

          visit.approvalStatus = approvalStatus;
          visit.approvedBy = userId;
          visit.approvedAt = new Date();

          if (approvalStatus === 'REJECTED') {
            visit.rejectionReason = rejectionReason;
            visit.status = 'CANCELLED';
          } else if (approvalStatus === 'APPROVED') {
            // Auto check-in when approved
            visit.status = 'IN_PROGRESS';
            visit.checkInTime = new Date();
            visit.verifiedBySecurity = userId;
            visit.verifiedAt = new Date();
            visit.checkIn = true;
          } else if (approvalStatus === 'CANCELLED') {
            visit.status = 'CANCELLED';
          }
        }
        
        if (securityNotes) {
          visit.securityNotes = securityNotes;
          visit.verifiedBySecurity = userId;
          visit.verifiedAt = new Date();
        }
      } else if (role === 'BUILDING_ADMIN' || role === 'SUPER_ADMIN') {
        // Admin can approve/reject visits
        if (approvalStatus) {
          if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(approvalStatus)) {
            return res.status(400).json({
              success: false,
              message: 'Invalid approval status'
            });
          }

          visit.approvalStatus = approvalStatus;
          visit.approvedBy = userId;
          visit.approvedAt = new Date();

          if (approvalStatus === 'REJECTED') {
            visit.rejectionReason = rejectionReason;
            visit.status = 'CANCELLED';
          } else if (approvalStatus === 'APPROVED') {
            // Auto check-in when approved
            visit.status = 'IN_PROGRESS';
            visit.checkInTime = new Date();
            visit.verifiedBySecurity = userId;
            visit.verifiedAt = new Date();
            visit.checkIn = true;
          } else if (approvalStatus === 'CANCELLED') {
            visit.status = 'CANCELLED';
          }
        }
      }

      await visit.save();

      // Create notifications
      if (approvalStatus) {
        const notificationData = {
          notificationId: `NOTIF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          buildingId,
          relatedVisitId: visit._id,
          relatedVisitorId: visit.visitorId._id,
          deliveryChannels: { inApp: true, email: true, sms: false }
        };

        if (approvalStatus === 'APPROVED') {
          // Notify host that visitor is approved and checked in
          try {
            await Notification.create({
              ...notificationData,
              recipientId: visit.hostId._id,
              recipientRole: visit.hostId.role || 'RESIDENT',
              title: 'Visitor Approved & Checked In',
              message: `${visit.visitorId.name} has been approved and is now in the building`,
              type: 'VISITOR_ARRIVAL',
              category: 'SUCCESS',
              priority: 'MEDIUM'
            });
            
            // Update notification status
            visit.notificationsSent.host = true;
            visit.notificationsSent.checkIn = true;
          } catch (notificationError) {
            console.error('Host notification creation failed:', notificationError);
            // Continue even if notification fails
          }

          // Notify building admin
          try {
            const buildingAdmin = await User.findOne({ buildingId, role: 'BUILDING_ADMIN' });
            if (buildingAdmin) {
              await Notification.create({
                ...notificationData,
                recipientId: buildingAdmin._id,
                recipientRole: 'BUILDING_ADMIN',
                title: 'Visitor Approved & Checked In',
                message: `${visit.visitorId.name} has been approved and checked in to ${visit.hostId.name}`,
                type: 'VISITOR_ARRIVAL',
                category: 'INFO',
                priority: 'LOW'
              });
              
              // Update notification status
              visit.notificationsSent.admin = true;
            }
          } catch (notificationError) {
            console.error('Building admin notification creation failed:', notificationError);
            // Continue even if notification fails
          }
        } else if (approvalStatus === 'REJECTED') {
          // Notify host only (visitors don't have accounts for in-app notifications)
          try {
            await Notification.create({
              ...notificationData,
              recipientId: visit.hostId._id,
              recipientRole: visit.hostId.role || 'RESIDENT',
              title: 'Visit Rejected',
              message: `${visit.visitorId.name}'s visit has been rejected`,
              type: 'VISIT_REJECTED',
              category: 'WARNING',
              priority: 'HIGH',
              metadata: { rejectionReason }
            });
            
            // Update notification status
            visit.notificationsSent.host = true;
          } catch (notificationError) {
            console.error('Host notification creation failed:', notificationError);
            // Continue even if notification fails
          }
        }
        
        // Save the updated notification status
        await visit.save();
      }

      res.status(200).json({
        success: true,
        message: 'Visit updated successfully',
        data: { visit }
      });

    } catch (error) {
      console.error('Update visit error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check-in visitor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async checkIn(req, res) {
    try {
      const { buildingId, visitId } = req.params;
      const { qrCode, entryPhotoId, securityNotes } = req.body;
      const { userId, role } = req.user;

      // Only security and building admin can perform check-in
      if (role !== 'SECURITY' && role !== 'BUILDING_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only security personnel and building admins can perform check-in'
        });
      }

      // Handle both MongoDB ObjectId and custom visit ID
      const query = { buildingId };
      if (mongoose.Types.ObjectId.isValid(visitId)) {
        query._id = visitId;
      } else {
        query.visitId = visitId;
      }

      const visit = await Visit.findOne(query)
        .populate([
          { path: 'visitorId', select: 'name phoneNumber email' },
          { path: 'hostId', select: 'name phoneNumber email role' }
        ]);

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found'
        });
      }

      // Verify QR code
      if (visit.qrCode !== qrCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid QR code'
        });
      }

      // Check if QR code is expired
      if (new Date() > visit.qrCodeExpiresAt) {
        return res.status(400).json({
          success: false,
          message: 'QR code has expired'
        });
      }

      // Check if visit is already checked in
      if (visit.checkInTime) {
        return res.status(400).json({
          success: false,
          message: 'Visit is already checked in'
        });
      }

      // Check if visit is approved
      if (visit.approvalStatus !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Visit must be approved before check-in'
        });
      }

      // Update visit
      visit.checkInTime = new Date();
      visit.status = 'IN_PROGRESS';
      visit.verifiedBySecurity = userId;
      visit.verifiedAt = new Date();
      visit.entryPhoto = entryPhotoId;
      if (securityNotes) {
        visit.securityNotes = securityNotes;
      }

      await visit.save();

      // Create notifications
      const notificationData = {
        notificationId: `NOTIF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        buildingId,
        relatedVisitId: visit._id,
        relatedVisitorId: visit.visitorId._id,
        deliveryChannels: { inApp: true, email: true, sms: true }
      };

      // Notify host
      try {
        await Notification.create({
          ...notificationData,
          recipientId: visit.hostId._id,
          recipientRole: visit.hostId.role || 'RESIDENT',
          title: 'Visitor Checked In',
          message: `${visit.visitorId.name} has checked in`,
          type: 'VISITOR_ARRIVAL',
          category: 'INFO',
          priority: 'MEDIUM'
        });
        
        // Update notification status
        visit.notificationsSent.host = true;
        visit.notificationsSent.checkIn = true;
      } catch (notificationError) {
        console.error('Host notification creation failed:', notificationError);
        // Continue with check-in even if notification fails
      }

      // Notify building admin
      try {
        const buildingAdmin = await User.findOne({ buildingId, role: 'BUILDING_ADMIN' });
        if (buildingAdmin) {
          await Notification.create({
            ...notificationData,
            recipientId: buildingAdmin._id,
            recipientRole: 'BUILDING_ADMIN',
            title: 'Visitor Checked In',
            message: `${visit.visitorId.name} has checked in to ${visit.hostId.name}`,
            type: 'VISITOR_ARRIVAL',
            category: 'INFO',
            priority: 'LOW'
          });
          
          // Update notification status
          visit.notificationsSent.admin = true;
        }
      } catch (notificationError) {
        console.error('Building admin notification creation failed:', notificationError);
        // Continue with check-in even if notification fails
      }
      
      // Save the updated notification status
      await visit.save();

      res.status(200).json({
        success: true,
        message: 'Visitor checked in successfully',
        data: { visit }
      });

    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Scan QR Code and get visitor details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async scanQRCode(req, res) {
    try {
      const { qrCode } = req.body;
      const { buildingId } = req.params;

      if (!qrCode) {
        return res.status(400).json({
          success: false,
          message: 'QR code is required'
        });
      }

      // Find visit by QR code
      const visit = await Visit.findOne({ 
        qrCode, 
        buildingId,
        isActive: true 
      })
      .populate('visitorId', 'name phoneNumber email visitorCategory serviceType vehicleNumber')
      .populate('hostId', 'name phoneNumber flatNumber')
      .populate('buildingId', 'name address');

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Invalid QR code or visit not found'
        });
      }

      // Check if QR code is expired
      if (new Date() > visit.qrCodeExpiresAt) {
        return res.status(400).json({
          success: false,
          message: 'QR code has expired'
        });
      }

      // Check if visit is already checked in
      if (visit.checkInTime) {
        return res.status(400).json({
          success: false,
          message: 'Visitor is already checked in',
          data: {
            visit: {
              visitId: visit.visitId,
              visitor: visit.visitorId,
              host: visit.hostId,
              checkInTime: visit.checkInTime,
              checkOutTime: visit.checkOutTime,
              status: visit.status
            }
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'QR code scanned successfully',
        data: {
          visit: {
            visitId: visit.visitId,
            visitor: {
              name: visit.visitorId.name,
              phoneNumber: visit.visitorId.phoneNumber,
              email: visit.visitorId.email,
              category: visit.visitorId.visitorCategory,
              serviceType: visit.visitorId.serviceType,
              vehicleNumber: visit.visitorId.vehicleNumber
            },
            host: {
              name: visit.hostId.name,
              phoneNumber: visit.hostId.phoneNumber,
              flatNumber: visit.hostId.flatNumber
            },
            purpose: visit.purpose,
            scheduledDate: visit.scheduledDate,
            scheduledTime: visit.scheduledTime,
            approvalStatus: visit.approvalStatus,
            status: visit.status,
            checkInTime: visit.checkInTime,
            checkOutTime: visit.checkOutTime,
            building: visit.buildingId
          }
        }
      });

    } catch (error) {
      console.error('Scan QR code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Get QR Code for a visit
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getQRCode(req, res) {
    try {
      const { buildingId, visitId } = req.params;

      // Handle both MongoDB ObjectId and custom visit ID
      const query = { buildingId, isActive: true };
      if (mongoose.Types.ObjectId.isValid(visitId)) {
        query._id = visitId;
      } else {
        query.visitId = visitId;
      }

      const visit = await Visit.findOne(query)
      .populate('visitorId', 'name phoneNumber')
      .populate('hostId', 'name flatNumber');

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found'
        });
      }

      // Check if visit is approved
      if (visit.approvalStatus !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Visit must be approved to generate QR code'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          visitId: visit.visitId,
          qrCode: visit.qrCode,
          qrCodeExpiresAt: visit.qrCodeExpiresAt,
          visitor: {
            name: visit.visitorId.name,
            phoneNumber: visit.visitorId.phoneNumber
          },
          host: {
            name: visit.hostId.name,
            flatNumber: visit.hostId.flatNumber
          },
          purpose: visit.purpose,
          scheduledDate: visit.scheduledDate,
          scheduledTime: visit.scheduledTime
        }
      });

    } catch (error) {
      console.error('Get QR code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  /**
   * Check-out visitor
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async checkOut(req, res) {
    try {
      const { buildingId, visitId } = req.params;
      const { exitPhotoId, securityNotes } = req.body;
      const { userId, role } = req.user;

      // Only security and building admin can perform check-out
      if (role !== 'SECURITY' && role !== 'BUILDING_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only security personnel and building admins can perform check-out'
        });
      }

      // Handle both MongoDB ObjectId and custom visit ID
      const query = { buildingId };
      if (mongoose.Types.ObjectId.isValid(visitId)) {
        query._id = visitId;
      } else {
        query.visitId = visitId;
      }

      const visit = await Visit.findOne(query)
        .populate([
          { path: 'visitorId', select: 'name phoneNumber email' },
          { path: 'hostId', select: 'name phoneNumber email role' }
        ]);

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found'
        });
      }

      // Check if visit is checked in
      if (!visit.checkInTime) {
        return res.status(400).json({
          success: false,
          message: 'Visit must be checked in before check-out'
        });
      }

      // Check if visit is already checked out
      if (visit.checkOutTime) {
        return res.status(400).json({
          success: false,
          message: 'Visit is already checked out'
        });
      }

      // Update visit
      visit.checkOutTime = new Date();
      visit.status = 'COMPLETED';
      visit.exitPhoto = exitPhotoId;
      visit.actualDuration = Math.round((visit.checkOutTime - visit.checkInTime) / (1000 * 60)); // Duration in minutes
      if (securityNotes) {
        visit.securityNotes = visit.securityNotes ? 
          `${visit.securityNotes}\n${securityNotes}` : securityNotes;
      }

      await visit.save();

      // Create notifications
      const notificationData = {
        notificationId: `NOTIF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        buildingId,
        relatedVisitId: visit._id,
        relatedVisitorId: visit.visitorId._id,
        deliveryChannels: { inApp: true, email: true, sms: false }
      };

      // Notify host
      try {
        await Notification.create({
          ...notificationData,
          recipientId: visit.hostId._id,
          recipientRole: visit.hostId.role || 'RESIDENT',
          title: 'Visitor Checked Out',
          message: `${visit.visitorId.name} has checked out`,
          type: 'VISITOR_DEPARTURE',
          category: 'INFO',
          priority: 'MEDIUM'
        });
        
        // Update notification status
        visit.notificationsSent.host = true;
        visit.notificationsSent.checkOut = true;
      } catch (notificationError) {
        console.error('Host notification creation failed:', notificationError);
        // Continue with check-out even if notification fails
      }

      // Notify building admin
      try {
        const buildingAdmin = await User.findOne({ buildingId, role: 'BUILDING_ADMIN' });
        if (buildingAdmin) {
          await Notification.create({
            ...notificationData,
            recipientId: buildingAdmin._id,
            recipientRole: 'BUILDING_ADMIN',
            title: 'Visitor Checked Out',
            message: `${visit.visitorId.name} has checked out from ${visit.hostId.name}`,
            type: 'VISITOR_DEPARTURE',
            category: 'INFO',
            priority: 'LOW'
          });
          
          // Update notification status
          visit.notificationsSent.admin = true;
        }
      } catch (notificationError) {
        console.error('Building admin notification creation failed:', notificationError);
        // Continue with check-out even if notification fails
      }
      
      // Save the updated notification status
      await visit.save();

      res.status(200).json({
        success: true,
        message: 'Visitor checked out successfully',
        data: { visit }
      });

    } catch (error) {
      console.error('Check-out error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get visit statistics for a building
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getVisitStats(req, res) {
    try {
      const { buildingId } = req.params;
      const { startDate, endDate } = req.query;

      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      const baseQuery = { buildingId, ...dateFilter };

      // Get total visits
      const totalVisits = await Visit.countDocuments(baseQuery);

      // Get visits by status
      const visitsByStatus = await Visit.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      // Get visits by type
      const visitsByType = await Visit.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$visitType', count: { $sum: 1 } } }
      ]);

      // Get visits by approval status
      const visitsByApproval = await Visit.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
      ]);

      // Get today's visits
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayVisits = await Visit.countDocuments({
        ...baseQuery,
        createdAt: { $gte: today, $lt: tomorrow }
      });

      // Get average visit duration
      const avgDuration = await Visit.aggregate([
        { $match: { ...baseQuery, actualDuration: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgDuration: { $avg: '$actualDuration' } } }
      ]);

      // Get recent visits (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentVisits = await Visit.countDocuments({
        ...baseQuery,
        createdAt: { $gte: sevenDaysAgo }
      });

      res.status(200).json({
        success: true,
        message: 'Visit statistics retrieved successfully',
        data: {
          totalVisits,
          todayVisits,
          recentVisits,
          avgDuration: avgDuration.length > 0 ? Math.round(avgDuration[0].avgDuration) : 0,
          visitsByStatus: visitsByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          visitsByType: visitsByType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          visitsByApproval: visitsByApproval.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        }
      });

    } catch (error) {
      console.error('Get visit stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Search visits
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchVisits(req, res) {
    try {
      const { buildingId } = req.params;
      const {
        query,
        page = 1,
        limit = 10,
        status,
        visitType,
        startDate,
        endDate
      } = req.query;

      const skip = (page - 1) * limit;
      const searchQuery = { buildingId };

      // Apply filters
      if (status) searchQuery.status = status;
      if (visitType) searchQuery.visitType = visitType;
      if (startDate || endDate) {
        searchQuery.createdAt = {};
        if (startDate) searchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) searchQuery.createdAt.$lte = new Date(endDate);
      }

      // Text search
      if (query) {
        searchQuery.$or = [
          { visitId: { $regex: query, $options: 'i' } },
          { purpose: { $regex: query, $options: 'i' } },
          { hostFlatNumber: { $regex: query, $options: 'i' } },
          { vehicleNumber: { $regex: query, $options: 'i' } }
        ];
      }

      const visits = await Visit.find(searchQuery)
        .populate([
          { path: 'visitorId', select: 'name phoneNumber email' },
          { path: 'hostId', select: 'name phoneNumber email' }
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalVisits = await Visit.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalVisits / limit);

      res.status(200).json({
        success: true,
        message: 'Visits search completed successfully',
        data: {
          visits,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalVisits,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Search visits error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = VisitController;
