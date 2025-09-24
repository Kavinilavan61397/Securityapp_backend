require("dotenv").config();
const axios = require('axios');

/**
 * Password Authentication System Test
 * Tests the new password + OTP authentication flow
 */

const BASE_URL = process.env.BASE_URL || `https://securityapp-backend.vercel.app`;
const API_BASE = `${BASE_URL}/api/auth`;

// Test credentials for different roles
const timestamp = Date.now();
const testCredentials = {
  superAdmin: {
    name: 'Password Test Super Admin',
    email: `passwordtest${timestamp}@super.com`,
    phoneNumber: `+9198765${timestamp.toString().slice(-5)}`,
    password: 'password123',
    role: 'SUPER_ADMIN'
  },
  security: {
    name: 'Password Test Security',
    email: `passwordtest${timestamp + 1}@security.com`,
    phoneNumber: `+9198765${(timestamp + 1).toString().slice(-5)}`,
    password: 'password123',
    role: 'SECURITY',
    employeeCode: `SEC${timestamp.toString().slice(-3)}`
  },
  resident: {
    name: 'Password Test Resident',
    email: `passwordtest${timestamp + 2}@resident.com`,
    phoneNumber: `+9198765${(timestamp + 2).toString().slice(-5)}`,
    password: 'password123',
    role: 'RESIDENT',
    flatNumber: 'A-101'
  }
};

async function testPasswordAuthentication() {
  console.log('🔐 Testing Password Authentication System...');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Registration with Password
    console.log('\n📝 Test 1: User Registration with Password...');
    for (const [role, userData] of Object.entries(testCredentials)) {
      try {
        console.log(`\n🔸 Testing ${role} registration...`);
        const registerResponse = await axios.post(`${API_BASE}/register`, userData);
        
        if (registerResponse.data.success) {
          console.log(`✅ ${role} registration successful`);
          console.log(`   User ID: ${registerResponse.data.data.userId}`);
          console.log(`   OTP Code: ${registerResponse.data.data.otpCode}`);
          
          // Store data for login test
          userData.userId = registerResponse.data.data.userId;
          userData.otpCode = registerResponse.data.data.otpCode;
          
        } else {
          console.log(`❌ ${role} registration failed: ${registerResponse.data.message}`);
        }
        
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
          console.log(`ℹ️  ${role} already exists, proceeding to login test...`);
          // Try to login to get OTP
          await testLoginForExistingUser(role, userData);
        } else {
          console.log(`❌ ${role} registration error: ${error.response?.data?.message || error.message}`);
        }
      }
    }
    
    // Test 2: Login with Password
    console.log('\n🔑 Test 2: User Login with Password...');
    for (const [role, userData] of Object.entries(testCredentials)) {
      await testLoginWithPassword(role, userData);
    }
    
    // Test 3: OTP Verification
    console.log('\n📱 Test 3: OTP Verification...');
    for (const [role, userData] of Object.entries(testCredentials)) {
      await testOTPVerification(role, userData);
    }
    
    // Test 4: Test Wrong Password
    console.log('\n❌ Test 4: Wrong Password Test...');
    await testWrongPassword();
    
    // Test 5: Test Missing Password
    console.log('\n⚠️  Test 5: Missing Password Test...');
    await testMissingPassword();
    
    console.log('\n🎉 Password Authentication System Test Complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testLoginForExistingUser(role, userData) {
  try {
    console.log(`🔸 Testing ${role} login for existing user...`);
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      password: userData.password,
      role: userData.role
    });
    
    if (loginResponse.data.success) {
      console.log(`✅ ${role} login successful`);
      userData.userId = loginResponse.data.data.userId;
      userData.otpCode = loginResponse.data.data.otpCode;
    }
    
  } catch (error) {
    console.log(`❌ ${role} login error: ${error.response?.data?.message || error.message}`);
  }
}

async function testLoginWithPassword(role, userData) {
  try {
    console.log(`\n🔸 Testing ${role} login with password...`);
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      password: userData.password,
      role: userData.role
    });
    
    if (loginResponse.data.success) {
      console.log(`✅ ${role} login successful`);
      console.log(`   OTP sent to: ${loginResponse.data.data.email}`);
      userData.userId = loginResponse.data.data.userId;
      userData.otpCode = loginResponse.data.data.otpCode;
    } else {
      console.log(`❌ ${role} login failed: ${loginResponse.data.message}`);
    }
    
  } catch (error) {
    console.log(`❌ ${role} login error: ${error.response?.data?.message || error.message}`);
  }
}

async function testOTPVerification(role, userData) {
  if (!userData.userId || !userData.otpCode) {
    console.log(`⚠️  Skipping ${role} OTP verification - no valid OTP`);
    return;
  }
  
  try {
    console.log(`\n🔸 Testing ${role} OTP verification...`);
    const verifyResponse = await axios.post(`${API_BASE}/verify-otp`, {
      userId: userData.userId,
      otp: userData.otpCode
    });
    
    if (verifyResponse.data.success) {
      console.log(`✅ ${role} OTP verification successful`);
      console.log(`   Token received: ${verifyResponse.data.data.token.substring(0, 20)}...`);
      userData.token = verifyResponse.data.data.token;
    } else {
      console.log(`❌ ${role} OTP verification failed: ${verifyResponse.data.message}`);
    }
    
  } catch (error) {
    console.log(`❌ ${role} OTP verification error: ${error.response?.data?.message || error.message}`);
  }
}

async function testWrongPassword() {
  try {
    console.log('🔸 Testing login with wrong password...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      email: testCredentials.superAdmin.email,
      phoneNumber: testCredentials.superAdmin.phoneNumber,
      password: 'wrongpassword',
      role: testCredentials.superAdmin.role
    });
    
    console.log('❌ Wrong password test failed - should have been rejected');
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Wrong password correctly rejected');
    } else {
      console.log(`❌ Unexpected error: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function testMissingPassword() {
  try {
    console.log('🔸 Testing login without password...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      email: testCredentials.superAdmin.email,
      phoneNumber: testCredentials.superAdmin.phoneNumber,
      role: testCredentials.superAdmin.role
    });
    
    console.log('❌ Missing password test failed - should have been rejected');
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Missing password correctly rejected');
    } else {
      console.log(`❌ Unexpected error: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Run the test
testPasswordAuthentication();
