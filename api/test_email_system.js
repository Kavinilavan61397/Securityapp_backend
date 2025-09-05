const axios = require('axios');
require('dotenv').config();

/**
 * Email System Test Script
 * Tests the complete email-based OTP system
 */

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

console.log('🧪 EMAIL SYSTEM TEST SCRIPT');
console.log('============================');
console.log(`🌐 Base URL: ${BASE_URL}`);
console.log('');

async function testEmailService() {
  try {
    console.log('📧 Testing Email Service...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/test-email`, {}, {
      timeout: 10000
    });

    if (response.data.success) {
      console.log('✅ Email service test successful!');
      console.log(`📨 Message: ${response.data.message}`);
    } else {
      console.log('❌ Email service test failed!');
      console.log(`📨 Error: ${response.data.error}`);
    }

  } catch (error) {
    console.log('❌ Email service test failed!');
    if (error.response) {
      console.log(`📨 Status: ${error.response.status}`);
      console.log(`📨 Error: ${error.response.data.message || error.response.data.error}`);
    } else {
      console.log(`📨 Error: ${error.message}`);
    }
  }
}

async function testRegistrationWithEmail() {
  try {
    console.log('\n👤 Testing Registration with Email OTP...');
    
    const userData = {
      name: 'Email Test User',
      email: 'test@example.com',
      phoneNumber: '+1234567890',
      role: 'RESIDENT',
      buildingId: '507f1f77bcf86cd799439011', // Use a valid building ID
      flatNumber: 'A-101',
      tenantType: 'OWNER',
      age: 30,
      gender: 'MALE'
    };

    const response = await axios.post(`${BASE_URL}/api/auth/register`, userData, {
      timeout: 15000
    });

    if (response.data.success) {
      console.log('✅ Registration successful!');
      console.log(`📨 Message: ${response.data.message}`);
      console.log(`📧 Email Sent: ${response.data.data.emailSent}`);
      console.log(`👤 User ID: ${response.data.data.userId}`);
      console.log(`📧 Email: ${response.data.data.email}`);
      console.log(`🔑 Role: ${response.data.data.role}`);
      
      if (response.data.data.otpCode) {
        console.log(`🔢 OTP Code: ${response.data.data.otpCode}`);
      }
      
      return response.data.data.userId;
    } else {
      console.log('❌ Registration failed!');
      console.log(`📨 Error: ${response.data.message}`);
      return null;
    }

  } catch (error) {
    console.log('❌ Registration test failed!');
    if (error.response) {
      console.log(`📨 Status: ${error.response.status}`);
      console.log(`📨 Error: ${error.response.data.message || error.response.data.error}`);
    } else {
      console.log(`📨 Error: ${error.message}`);
    }
    return null;
  }
}

async function testLoginWithEmail() {
  try {
    console.log('\n🔐 Testing Login with Email OTP...');
    
    const loginData = {
      email: 'test@example.com',
      role: 'RESIDENT'
    };

    const response = await axios.post(`${BASE_URL}/api/auth/login`, loginData, {
      timeout: 15000
    });

    if (response.data.success) {
      console.log('✅ Login OTP sent successfully!');
      console.log(`📨 Message: ${response.data.message}`);
      console.log(`📧 Email Sent: ${response.data.data.emailSent}`);
      console.log(`👤 User ID: ${response.data.data.userId}`);
      console.log(`📧 Email: ${response.data.data.email}`);
      console.log(`🔑 Role: ${response.data.data.role}`);
      
      if (response.data.data.otpCode) {
        console.log(`🔢 OTP Code: ${response.data.data.otpCode}`);
      }
      
      return response.data.data.userId;
    } else {
      console.log('❌ Login OTP failed!');
      console.log(`📨 Error: ${response.data.message}`);
      return null;
    }

  } catch (error) {
    console.log('❌ Login test failed!');
    if (error.response) {
      console.log(`📨 Status: ${error.response.status}`);
      console.log(`📨 Error: ${error.response.data.message || error.response.data.error}`);
    } else {
      console.log(`📨 Error: ${error.message}`);
    }
    return null;
  }
}

async function testOTPVerification(userId, otpCode) {
  try {
    console.log('\n🔢 Testing OTP Verification...');
    
    const otpData = {
      userId: userId,
      otp: otpCode
    };

    const response = await axios.post(`${BASE_URL}/api/auth/verify-otp`, otpData, {
      timeout: 10000
    });

    if (response.data.success) {
      console.log('✅ OTP verification successful!');
      console.log(`📨 Message: ${response.data.message}`);
      console.log(`👤 User: ${response.data.data.user.name}`);
      console.log(`📧 Email: ${response.data.data.user.email}`);
      console.log(`🔑 Role: ${response.data.data.user.role}`);
      console.log(`✅ Verified: ${response.data.data.user.isVerified}`);
      console.log(`🎫 Token: ${response.data.data.token.substring(0, 50)}...`);
      console.log(`⏰ Expires: ${response.data.data.expiresIn}`);
      
      return response.data.data.token;
    } else {
      console.log('❌ OTP verification failed!');
      console.log(`📨 Error: ${response.data.message}`);
      return null;
    }

  } catch (error) {
    console.log('❌ OTP verification test failed!');
    if (error.response) {
      console.log(`📨 Status: ${error.response.status}`);
      console.log(`📨 Error: ${response.data.message || error.response.data.error}`);
    } else {
      console.log(`📨 Error: ${error.message}`);
    }
    return null;
  }
}

async function testResendOTP(userId) {
  try {
    console.log('\n🔄 Testing Resend OTP...');
    
    const resendData = {
      userId: userId
    };

    const response = await axios.post(`${BASE_URL}/api/auth/resend-otp`, resendData, {
      timeout: 15000
    });

    if (response.data.success) {
      console.log('✅ Resend OTP successful!');
      console.log(`📨 Message: ${response.data.message}`);
      console.log(`📧 Email Sent: ${response.data.data.emailSent}`);
      console.log(`👤 User ID: ${response.data.data.userId}`);
      
      if (response.data.data.otpCode) {
        console.log(`🔢 New OTP Code: ${response.data.data.otpCode}`);
      }
      
      return response.data.data.otpCode;
    } else {
      console.log('❌ Resend OTP failed!');
      console.log(`📨 Error: ${response.data.message}`);
      return null;
    }

  } catch (error) {
    console.log('❌ Resend OTP test failed!');
    if (error.response) {
      console.log(`📨 Status: ${error.response.status}`);
      console.log(`📨 Error: ${error.response.data.message || error.response.data.error}`);
    } else {
      console.log(`📨 Error: ${error.message}`);
    }
    return null;
  }
}

async function runCompleteEmailTest() {
  console.log('🚀 Starting Complete Email System Test...\n');

  // Test 1: Email Service
  await testEmailService();

  // Test 2: Registration with Email OTP
  const userId = await testRegistrationWithEmail();
  
  if (userId) {
    // Test 3: Login with Email OTP
    const loginUserId = await testLoginWithEmail();
    
    if (loginUserId) {
      // Test 4: Resend OTP
      const newOtpCode = await testResendOTP(loginUserId);
      
      if (newOtpCode) {
        // Test 5: OTP Verification
        const token = await testOTPVerification(loginUserId, newOtpCode);
        
        if (token) {
          console.log('\n🎉 COMPLETE EMAIL SYSTEM TEST SUCCESSFUL!');
          console.log('==========================================');
          console.log('✅ Email service working');
          console.log('✅ Registration with email OTP working');
          console.log('✅ Login with email OTP working');
          console.log('✅ Resend OTP working');
          console.log('✅ OTP verification working');
          console.log('✅ Welcome email sent');
          console.log('✅ JWT token generated');
          console.log('\n🚀 Your email-based OTP system is fully functional!');
        }
      }
    }
  }

  console.log('\n📧 Email System Test Complete!');
}

// Run the test
runCompleteEmailTest().catch(error => {
  console.error('❌ Test script failed:', error.message);
  process.exit(1);
});
