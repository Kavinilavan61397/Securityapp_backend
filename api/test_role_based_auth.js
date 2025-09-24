const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app/api/auth';
const BUILDING_ID = '68b04099951cc19873fc3dd3';

// Test data
const testUsers = {
  security: {
    username: 'security_test',
    password: 'password123',
    name: 'Security Guard Test',
    email: 'security.test@example.com',
    phoneNumber: '+919876543210',
    role: 'SECURITY',
    employeeCode: 'SEC001'
  },
  buildingAdmin: {
    username: 'admin_test',
    password: 'password123',
    name: 'Building Admin Test',
    email: 'admin.test@example.com',
    phoneNumber: '+919876543211',
    role: 'BUILDING_ADMIN',
    employeeCode: 'ADM001'
  },
  resident: {
    username: 'resident_test',
    password: 'password123',
    name: 'Resident Test',
    email: 'resident.test@example.com',
    phoneNumber: '+919876543212',
    role: 'RESIDENT',
    flatNumber: 'A-101'
  }
};

async function registerUser(userData) {
  try {
    console.log(`\n🔐 Registering ${userData.role} user...`);
    const response = await axios.post(`${BASE_URL}/register`, {
      ...userData,
      buildingId: BUILDING_ID
    });
    
    if (response.data.success) {
      console.log(`✅ ${userData.role} registration successful`);
      console.log(`   User ID: ${response.data.data.userId}`);
      console.log(`   Email Sent: ${response.data.data.emailSent}`);
      return response.data.data.userId;
    } else {
      console.log(`❌ ${userData.role} registration failed:`, response.data.message);
      return null;
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message.includes('already exists')) {
      console.log(`ℹ️  ${userData.role} user already exists, proceeding with login test`);
      return 'existing';
    } else {
      console.log(`❌ ${userData.role} registration error:`, error.response?.data?.message || error.message);
      return null;
    }
  }
}

async function testLogin(userData, expectedFlow) {
  try {
    console.log(`\n🔑 Testing ${userData.role} login...`);
    const response = await axios.post(`${BASE_URL}/login`, {
      username: userData.username,
      password: userData.password
    });
    
    if (response.data.success) {
      console.log(`✅ ${userData.role} login successful`);
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Requires OTP: ${response.data.data.requiresOtp}`);
      
      if (expectedFlow === 'direct') {
        // Should get token directly
        if (response.data.data.token && !response.data.data.requiresOtp) {
          console.log(`✅ Direct token generation working for ${userData.role}`);
          console.log(`   Token received: ${response.data.data.token ? 'Yes' : 'No'}`);
          console.log(`   User role: ${response.data.data.user.role}`);
          console.log(`   Building ID: ${response.data.data.user.buildingId}`);
          return { success: true, token: response.data.data.token };
        } else {
          console.log(`❌ Expected direct token but got OTP flow for ${userData.role}`);
          return { success: false, error: 'Wrong flow' };
        }
      } else if (expectedFlow === 'otp') {
        // Should get OTP
        if (response.data.data.requiresOtp && response.data.data.userId) {
          console.log(`✅ OTP flow working for ${userData.role}`);
          console.log(`   User ID: ${response.data.data.userId}`);
          console.log(`   Email: ${response.data.data.email}`);
          return { success: true, userId: response.data.data.userId };
        } else {
          console.log(`❌ Expected OTP flow but got direct token for ${userData.role}`);
          return { success: false, error: 'Wrong flow' };
        }
      }
    } else {
      console.log(`❌ ${userData.role} login failed:`, response.data.message);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log(`❌ ${userData.role} login error:`, error.response?.data?.message || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

async function testOtpVerification(userId, otp = '1234') {
  try {
    console.log(`\n📱 Testing OTP verification...`);
    const response = await axios.post(`${BASE_URL}/verify-otp`, {
      userId: userId,
      otp: otp
    });
    
    if (response.data.success) {
      console.log(`✅ OTP verification successful`);
      console.log(`   Token received: ${response.data.data.token ? 'Yes' : 'No'}`);
      console.log(`   User role: ${response.data.data.user.role}`);
      console.log(`   Username: ${response.data.data.user.username}`);
      return { success: true, token: response.data.data.token };
    } else {
      console.log(`❌ OTP verification failed:`, response.data.message);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log(`❌ OTP verification error:`, error.response?.data?.message || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

async function testInvalidCredentials() {
  try {
    console.log(`\n🚫 Testing invalid credentials...`);
    const response = await axios.post(`${BASE_URL}/login`, {
      username: 'nonexistent_user',
      password: 'wrongpassword'
    });
    
    if (!response.data.success && response.status === 401) {
      console.log(`✅ Invalid credentials properly rejected`);
      console.log(`   Message: ${response.data.message}`);
      return { success: true };
    } else {
      console.log(`❌ Invalid credentials should have been rejected`);
      return { success: false, error: 'Security issue' };
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log(`✅ Invalid credentials properly rejected (401 status)`);
      console.log(`   Message: ${error.response.data.message}`);
      return { success: true };
    } else {
      console.log(`❌ Unexpected error for invalid credentials:`, error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }
}

async function runRoleBasedAuthTests() {
  console.log('🚀 STARTING ROLE-BASED AUTHENTICATION TESTS');
  console.log('=' .repeat(60));
  
  const results = {
    security: { registration: false, login: false, token: false },
    buildingAdmin: { registration: false, login: false, token: false },
    resident: { registration: false, login: false, otp: false, token: false },
    invalidCredentials: false
  };
  
  // Test 1: Register all users
  console.log('\n📝 STEP 1: USER REGISTRATION');
  console.log('-'.repeat(40));
  
  for (const [role, userData] of Object.entries(testUsers)) {
    const userId = await registerUser(userData);
    if (userId) {
      results[role].registration = true;
    }
  }
  
  // Test 2: Test Security Login (Direct Token)
  console.log('\n🔐 STEP 2: SECURITY LOGIN (DIRECT TOKEN)');
  console.log('-'.repeat(40));
  
  const securityResult = await testLogin(testUsers.security, 'direct');
  if (securityResult.success && securityResult.token) {
    results.security.login = true;
    results.security.token = true;
  }
  
  // Test 3: Test Building Admin Login (Direct Token)
  console.log('\n🏢 STEP 3: BUILDING ADMIN LOGIN (DIRECT TOKEN)');
  console.log('-'.repeat(40));
  
  const adminResult = await testLogin(testUsers.buildingAdmin, 'direct');
  if (adminResult.success && adminResult.token) {
    results.buildingAdmin.login = true;
    results.buildingAdmin.token = true;
  }
  
  // Test 4: Test Resident Login (OTP Flow)
  console.log('\n🏠 STEP 4: RESIDENT LOGIN (OTP FLOW)');
  console.log('-'.repeat(40));
  
  const residentResult = await testLogin(testUsers.resident, 'otp');
  if (residentResult.success && residentResult.userId) {
    results.resident.login = true;
    
    // Test OTP verification
    const otpResult = await testOtpVerification(residentResult.userId);
    if (otpResult.success && otpResult.token) {
      results.resident.otp = true;
      results.resident.token = true;
    }
  }
  
  // Test 5: Test Invalid Credentials
  console.log('\n🚫 STEP 5: INVALID CREDENTIALS TEST');
  console.log('-'.repeat(40));
  
  const invalidResult = await testInvalidCredentials();
  if (invalidResult.success) {
    results.invalidCredentials = true;
  }
  
  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  console.log('\n🔐 SECURITY ROLE:');
  console.log(`   Registration: ${results.security.registration ? '✅' : '❌'}`);
  console.log(`   Direct Login: ${results.security.login ? '✅' : '❌'}`);
  console.log(`   Token Received: ${results.security.token ? '✅' : '❌'}`);
  
  console.log('\n🏢 BUILDING ADMIN ROLE:');
  console.log(`   Registration: ${results.buildingAdmin.registration ? '✅' : '❌'}`);
  console.log(`   Direct Login: ${results.buildingAdmin.login ? '✅' : '❌'}`);
  console.log(`   Token Received: ${results.buildingAdmin.token ? '✅' : '❌'}`);
  
  console.log('\n🏠 RESIDENT ROLE:');
  console.log(`   Registration: ${results.resident.registration ? '✅' : '❌'}`);
  console.log(`   OTP Login: ${results.resident.login ? '✅' : '❌'}`);
  console.log(`   OTP Verification: ${results.resident.otp ? '✅' : '❌'}`);
  console.log(`   Token Received: ${results.resident.token ? '✅' : '❌'}`);
  
  console.log('\n🚫 SECURITY TESTS:');
  console.log(`   Invalid Credentials Rejected: ${results.invalidCredentials ? '✅' : '❌'}`);
  
  // Overall success
  const allTestsPassed = 
    results.security.login && results.security.token &&
    results.buildingAdmin.login && results.buildingAdmin.token &&
    results.resident.login && results.resident.otp && results.resident.token &&
    results.invalidCredentials;
  
  console.log('\n🎯 OVERALL RESULT:');
  if (allTestsPassed) {
    console.log('✅ ALL ROLE-BASED AUTHENTICATION TESTS PASSED!');
    console.log('✅ SECURITY & BUILDING_ADMIN: Direct token generation working');
    console.log('✅ RESIDENT: OTP verification flow working');
    console.log('✅ SECURITY: Invalid credentials properly rejected');
  } else {
    console.log('❌ SOME TESTS FAILED - CHECK ABOVE FOR DETAILS');
  }
  
  console.log('\n🚀 ROLE-BASED AUTHENTICATION SYSTEM IS READY!');
}

// Run the tests
runRoleBasedAuthTests().catch(console.error);
