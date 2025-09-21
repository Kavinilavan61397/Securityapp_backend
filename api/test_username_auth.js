require("dotenv").config();
const axios = require('axios');

/**
 * Username + Password Authentication System Test
 * Tests the simplified login flow with just username and password
 */

const BASE_URL = process.env.BASE_URL || `https://securityapp-backend.vercel.app`;
const API_BASE = `${BASE_URL}/api/auth`;

// Test credentials with unique usernames
const timestamp = Date.now();
const testCredentials = {
  superAdmin: {
    name: 'Username Test Super Admin',
    username: `testsuper${timestamp}`,
    email: `testsuper${timestamp}@test.com`,
    phoneNumber: `+9198765${timestamp.toString().slice(-5)}`,
    password: 'password123',
    role: 'SUPER_ADMIN'
  },
  security: {
    name: 'Username Test Security',
    username: `testsecurity${timestamp}`,
    email: `testsecurity${timestamp}@test.com`,
    phoneNumber: `+9198765${(timestamp + 1).toString().slice(-5)}`,
    password: 'password123',
    role: 'SECURITY',
    employeeCode: `SEC${timestamp.toString().slice(-3)}`
  },
  resident: {
    name: 'Username Test Resident',
    username: `testresident${timestamp}`,
    email: `testresident${timestamp}@test.com`,
    phoneNumber: `+9198765${(timestamp + 2).toString().slice(-5)}`,
    password: 'password123',
    role: 'RESIDENT',
    flatNumber: 'A-101'
  }
};

async function testUsernameAuthentication() {
  console.log('🔐 Testing Username + Password Authentication System...');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Registration with Username
    console.log('\n📝 Test 1: User Registration with Username...');
    for (const [role, userData] of Object.entries(testCredentials)) {
      try {
        console.log(`\n🔸 Testing ${role} registration...`);
        const registerResponse = await axios.post(`${API_BASE}/register`, userData);
        
        if (registerResponse.data.success) {
          console.log(`✅ ${role} registration successful`);
          console.log(`   Username: ${userData.username}`);
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
    
    // Test 2: Login with Username + Password
    console.log('\n🔑 Test 2: Username + Password Login...');
    for (const [role, userData] of Object.entries(testCredentials)) {
      await testLoginWithUsername(role, userData);
    }
    
    // Test 3: OTP Verification
    console.log('\n📱 Test 3: OTP Verification...');
    for (const [role, userData] of Object.entries(testCredentials)) {
      await testOTPVerification(role, userData);
    }
    
    // Test 4: Test Wrong Password
    console.log('\n❌ Test 4: Wrong Password Test...');
    await testWrongPassword();
    
    // Test 5: Test Wrong Username
    console.log('\n❌ Test 5: Wrong Username Test...');
    await testWrongUsername();
    
    // Test 6: Test Missing Fields
    console.log('\n⚠️  Test 6: Missing Fields Test...');
    await testMissingFields();
    
    console.log('\n🎉 Username + Password Authentication System Test Complete!');
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
      username: userData.username,
      password: userData.password
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

async function testLoginWithUsername(role, userData) {
  try {
    console.log(`\n🔸 Testing ${role} login with username...`);
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      username: userData.username,
      password: userData.password
    });
    
    if (loginResponse.data.success) {
      console.log(`✅ ${role} login successful`);
      console.log(`   Username: ${loginResponse.data.data.username}`);
      console.log(`   Role: ${loginResponse.data.data.role}`);
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
      console.log(`   Username: ${verifyResponse.data.data.user.username}`);
      console.log(`   Role: ${verifyResponse.data.data.user.role}`);
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
      username: testCredentials.superAdmin.username,
      password: 'wrongpassword'
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

async function testWrongUsername() {
  try {
    console.log('🔸 Testing login with wrong username...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      username: 'nonexistentuser',
      password: 'password123'
    });
    
    console.log('❌ Wrong username test failed - should have been rejected');
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Wrong username correctly rejected');
    } else {
      console.log(`❌ Unexpected error: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function testMissingFields() {
  // Test missing username
  try {
    console.log('🔸 Testing login without username...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      password: 'password123'
    });
    
    console.log('❌ Missing username test failed - should have been rejected');
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Missing username correctly rejected');
    } else {
      console.log(`❌ Unexpected error: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Test missing password
  try {
    console.log('🔸 Testing login without password...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      username: 'testuser'
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
testUsernameAuthentication();
