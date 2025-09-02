const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Notification Service
 * Handles multi-channel notification delivery (Email, SMS, Push)
 */

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
  }

  // Initialize email and SMS services
  initializeServices() {
    // Initialize email service
    if (process.env.EMAIL_SERVICE_ENABLED === 'true') {
      this.emailTransporter = nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }

    // Initialize SMS service
    if (process.env.SMS_SERVICE_ENABLED === 'true') {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  // Send notification through multiple channels
  async sendNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      const user = await User.findById(notification.recipientId);
      if (!user) {
        throw new Error('Recipient not found');
      }

      const results = {
        inApp: true, // Always true as it's already created
        email: false,
        sms: false,
        push: false
      };

      // Send email notification
      if (notification.deliveryChannels.email && this.emailTransporter) {
        try {
          await this.sendEmailNotification(notification, user);
          results.email = true;
        } catch (error) {
          console.error('Email delivery failed:', error);
        }
      }

      // Send SMS notification
      if (notification.deliveryChannels.sms && this.twilioClient) {
        try {
          await this.sendSMSNotification(notification, user);
          results.sms = true;
        } catch (error) {
          console.error('SMS delivery failed:', error);
        }
      }

      // Send push notification (placeholder for future implementation)
      if (notification.deliveryChannels.push) {
        try {
          await this.sendPushNotification(notification, user);
          results.push = true;
        } catch (error) {
          console.error('Push notification delivery failed:', error);
        }
      }

      // Update notification status
      await notification.markAsSent();

      return results;
    } catch (error) {
      console.error('Notification delivery failed:', error);
      throw error;
    }
  }

  // Send email notification
  async sendEmailNotification(notification, user) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: `[${notification.priority}] ${notification.title}`,
      html: this.generateEmailTemplate(notification, user)
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  // Send SMS notification
  async sendSMSNotification(notification, user) {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    const message = this.generateSMSTemplate(notification);
    
    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phoneNumber
    });
  }

  // Send push notification (placeholder)
  async sendPushNotification(notification, user) {
    // This would integrate with Firebase, OneSignal, or similar service
    console.log(`Push notification sent to user ${user._id}: ${notification.title}`);
  }

  // Generate email template
  generateEmailTemplate(notification, user) {
    const priorityColor = {
      'LOW': '#28a745',
      'MEDIUM': '#ffc107',
      'HIGH': '#fd7e14',
      'URGENT': '#dc3545',
      'CRITICAL': '#6f42c1'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${priorityColor[notification.priority]}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .priority-${notification.priority.toLowerCase()} { background: ${priorityColor[notification.priority]}; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${notification.title}</h1>
            <span class="priority priority-${notification.priority.toLowerCase()}">${notification.priority}</span>
          </div>
          <div class="content">
            <p>Hello ${user.name},</p>
            <p>${notification.message}</p>
            ${notification.actionRequired ? `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong>Action Required:</strong> ${notification.actionType}
                ${notification.actionDeadline ? `<br><strong>Deadline:</strong> ${new Date(notification.actionDeadline).toLocaleString()}` : ''}
              </div>
            ` : ''}
            <p>Best regards,<br>Visitor Management System</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>Notification ID: ${notification.notificationId}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate SMS template
  generateSMSTemplate(notification) {
    let message = `[${notification.priority}] ${notification.title}\n\n${notification.message}`;
    
    if (notification.actionRequired) {
      message += `\n\nAction Required: ${notification.actionType}`;
      if (notification.actionDeadline) {
        message += `\nDeadline: ${new Date(notification.actionDeadline).toLocaleString()}`;
      }
    }
    
    message += `\n\nID: ${notification.notificationId}`;
    
    return message;
  }

  // Process pending notifications
  async processPendingNotifications() {
    try {
      const pendingNotifications = await Notification.find({
        deliveryStatus: 'PENDING',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }).limit(50); // Process in batches

      for (const notification of pendingNotifications) {
        try {
          await this.sendNotification(notification._id);
        } catch (error) {
          console.error(`Failed to process notification ${notification._id}:`, error);
          await notification.markAsFailed(error.message);
        }
      }

      return pendingNotifications.length;
    } catch (error) {
      console.error('Error processing pending notifications:', error);
      throw error;
    }
  }

  // Retry failed notifications
  async retryFailedNotifications() {
    try {
      const failedNotifications = await Notification.find({
        deliveryStatus: 'FAILED',
        retryCount: { $lt: 3 }, // Max 3 retries
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }).limit(20);

      for (const notification of failedNotifications) {
        try {
          await notification.retry();
          await this.sendNotification(notification._id);
        } catch (error) {
          console.error(`Failed to retry notification ${notification._id}:`, error);
        }
      }

      return failedNotifications.length;
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      throw error;
    }
  }

  // Cleanup expired notifications
  async cleanupExpiredNotifications() {
    try {
      const result = await Notification.cleanupExpired();
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
