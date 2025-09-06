const nodemailer = require('nodemailer');

/**
 * Email Service for Visitor Management System
 * Handles OTP delivery, notifications, and system emails
 * 100% Dynamic - No hardcoded values
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   * Supports multiple email providers (Gmail, Outlook, SendGrid, etc.)
   */
  initializeTransporter() {
    try {
      // Get email configuration from environment variables
      const emailConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          // Fix for self-signed certificate error
          rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
          ciphers: 'SSLv3'
        }
      };

      // Create transporter
      this.transporter = nodemailer.createTransport(emailConfig);

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service configuration error:', error.message);
          console.log('💡 Please check your email configuration in .env file');
          
          // Provide specific solutions based on error type
          if (error.message.includes('self-signed certificate')) {
            console.log('🔧 Solution 1: Add NODE_TLS_REJECT_UNAUTHORIZED=0 to your .env file');
            console.log('🔧 Solution 2: Use App Password instead of regular password for Gmail');
            console.log('🔧 Solution 3: Check if you\'re behind a corporate firewall/proxy');
          } else if (error.message.includes('Invalid login')) {
            console.log('🔧 Solution: Check your EMAIL_USER and EMAIL_PASS in .env file');
            console.log('🔧 For Gmail: Use App Password, not your regular password');
          }
        } else {
          console.log('✅ Email service ready to send emails');
        }
      });

    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
    }
  }

  /**
   * Send OTP Email
   * @param {String} to - Recipient email
   * @param {String} otpCode - 4-digit OTP code
   * @param {String} userName - User's name
   * @param {String} purpose - Purpose of OTP (registration, login, etc.)
   * @returns {Promise<Boolean>} - Success status
   */
  async sendOTPEmail(to, otpCode, userName, purpose = 'verification') {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const subject = this.getOTPSubject(purpose);
      const htmlContent = this.generateOTPEmailTemplate(otpCode, userName, purpose);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Visitor Management System',
          address: process.env.EMAIL_USER
        },
        to: to,
        subject: subject,
        html: htmlContent,
        text: this.generateOTPTextContent(otpCode, userName, purpose)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${to}. Message ID: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        recipient: to
      };

    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send Welcome Email
   * @param {String} to - Recipient email
   * @param {String} userName - User's name
   * @param {String} role - User's role
   * @returns {Promise<Object>} - Result object
   */
  async sendWelcomeEmail(to, userName, role) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const subject = 'Welcome to Visitor Management System';
      const htmlContent = this.generateWelcomeEmailTemplate(userName, role);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Visitor Management System',
          address: process.env.EMAIL_USER
        },
        to: to,
        subject: subject,
        html: htmlContent,
        text: this.generateWelcomeTextContent(userName, role)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent successfully to ${to}. Message ID: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        recipient: to
      };

    } catch (error) {
      console.error('❌ Failed to send welcome email:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send Notification Email
   * @param {String} to - Recipient email
   * @param {String} subject - Email subject
   * @param {String} message - Notification message
   * @param {String} type - Notification type
   * @returns {Promise<Object>} - Result object
   */
  async sendNotificationEmail(to, subject, message, type = 'info') {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const htmlContent = this.generateNotificationEmailTemplate(subject, message, type);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Visitor Management System',
          address: process.env.EMAIL_USER
        },
        to: to,
        subject: subject,
        html: htmlContent,
        text: message
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Notification email sent successfully to ${to}. Message ID: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        recipient: to
      };

    } catch (error) {
      console.error('❌ Failed to send notification email:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get OTP Email Subject
   * @param {String} purpose - Purpose of OTP
   * @returns {String} - Email subject
   */
  getOTPSubject(purpose) {
    const subjects = {
      'registration': 'Verify Your Account - Visitor Management System',
      'login': 'Login Verification Code - Visitor Management System',
      'verification': 'Verification Code - Visitor Management System',
      'password_reset': 'Password Reset Code - Visitor Management System'
    };
    return subjects[purpose] || 'Verification Code - Visitor Management System';
  }

  /**
   * Generate OTP Email HTML Template
   * @param {String} otpCode - OTP code
   * @param {String} userName - User's name
   * @param {String} purpose - Purpose of OTP
   * @returns {String} - HTML content
   */
  generateOTPEmailTemplate(otpCode, userName, purpose) {
    const purposeText = {
      'registration': 'account registration',
      'login': 'login verification',
      'verification': 'account verification',
      'password_reset': 'password reset'
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .otp-code {
                background-color: #3498db;
                color: white;
                font-size: 32px;
                font-weight: bold;
                text-align: center;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                letter-spacing: 5px;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏢 Visitor Management System</div>
                <h2>Verification Code</h2>
            </div>
            
            <p>Hello <strong>${userName}</strong>,</p>
            
            <p>You have requested a verification code for ${purposeText[purpose] || 'account verification'}. 
            Please use the following code to complete your request:</p>
            
            <div class="otp-code">${otpCode}</div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                    <li>This code will expire in 5 minutes</li>
                    <li>Do not share this code with anyone</li>
                    <li>If you didn't request this code, please ignore this email</li>
                </ul>
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>© ${new Date().getFullYear()} Visitor Management System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate OTP Text Content
   * @param {String} otpCode - OTP code
   * @param {String} userName - User's name
   * @param {String} purpose - Purpose of OTP
   * @returns {String} - Text content
   */
  generateOTPTextContent(otpCode, userName, purpose) {
    const purposeText = {
      'registration': 'account registration',
      'login': 'login verification',
      'verification': 'account verification',
      'password_reset': 'password reset'
    };

    return `
Visitor Management System - Verification Code

Hello ${userName},

You have requested a verification code for ${purposeText[purpose] || 'account verification'}.

Your verification code is: ${otpCode}

This code will expire in 5 minutes.

IMPORTANT:
- Do not share this code with anyone
- If you didn't request this code, please ignore this email

If you have any questions, please contact our support team.

This is an automated message. Please do not reply to this email.

© ${new Date().getFullYear()} Visitor Management System. All rights reserved.
    `;
  }

  /**
   * Generate Welcome Email HTML Template
   * @param {String} userName - User's name
   * @param {String} role - User's role
   * @returns {String} - HTML content
   */
  generateWelcomeEmailTemplate(userName, role) {
    const roleDescription = {
      'SUPER_ADMIN': 'Super Administrator',
      'BUILDING_ADMIN': 'Building Administrator',
      'SECURITY': 'Security Personnel',
      'RESIDENT': 'Resident'
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Visitor Management System</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .welcome-badge {
                background-color: #27ae60;
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                display: inline-block;
                margin: 20px 0;
            }
            .features {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏢 Visitor Management System</div>
                <h2>Welcome Aboard!</h2>
            </div>
            
            <p>Hello <strong>${userName}</strong>,</p>
            
            <p>Welcome to the Visitor Management System! Your account has been successfully created and verified.</p>
            
            <div class="welcome-badge">
                Role: ${roleDescription[role] || role}
            </div>
            
            <div class="features">
                <h3>🚀 What you can do:</h3>
                <ul>
                    <li>Secure visitor management with QR codes</li>
                    <li>Real-time notifications and updates</li>
                    <li>Photo verification system</li>
                    <li>Comprehensive visit tracking</li>
                    <li>Role-based access control</li>
                </ul>
            </div>
            
            <p>Your account is now active and ready to use. You can log in using your registered email address.</p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <div class="footer">
                <p>Thank you for choosing Visitor Management System!</p>
                <p>© ${new Date().getFullYear()} Visitor Management System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate Welcome Text Content
   * @param {String} userName - User's name
   * @param {String} role - User's role
   * @returns {String} - Text content
   */
  generateWelcomeTextContent(userName, role) {
    const roleDescription = {
      'SUPER_ADMIN': 'Super Administrator',
      'BUILDING_ADMIN': 'Building Administrator',
      'SECURITY': 'Security Personnel',
      'RESIDENT': 'Resident'
    };

    return `
Visitor Management System - Welcome!

Hello ${userName},

Welcome to the Visitor Management System! Your account has been successfully created and verified.

Your Role: ${roleDescription[role] || role}

What you can do:
- Secure visitor management with QR codes
- Real-time notifications and updates
- Photo verification system
- Comprehensive visit tracking
- Role-based access control

Your account is now active and ready to use. You can log in using your registered email address.

If you have any questions or need assistance, please don't hesitate to contact our support team.

Thank you for choosing Visitor Management System!

© ${new Date().getFullYear()} Visitor Management System. All rights reserved.
    `;
  }

  /**
   * Generate Notification Email HTML Template
   * @param {String} subject - Email subject
   * @param {String} message - Notification message
   * @param {String} type - Notification type
   * @returns {String} - HTML content
   */
  generateNotificationEmailTemplate(subject, message, type) {
    const typeColors = {
      'info': '#3498db',
      'success': '#27ae60',
      'warning': '#f39c12',
      'error': '#e74c3c'
    };

    const typeIcons = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .notification {
                background-color: ${typeColors[type] || '#3498db'};
                color: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏢 Visitor Management System</div>
                <h2>${subject}</h2>
            </div>
            
            <div class="notification">
                <h3>${typeIcons[type] || 'ℹ️'} ${subject}</h3>
                <p>${message}</p>
            </div>
            
            <p>This is an automated notification from the Visitor Management System.</p>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} Visitor Management System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Test Email Service
   * @returns {Promise<Object>} - Test result
   */
  async testEmailService() {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const testEmail = process.env.EMAIL_USER;
      if (!testEmail) {
        throw new Error('No test email configured');
      }

      const result = await this.sendOTPEmail(
        testEmail,
        '1234',
        'Test User',
        'verification'
      );

      return {
        success: result.success,
        message: result.success ? 'Email service is working correctly' : 'Email service test failed',
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        message: 'Email service test failed',
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
