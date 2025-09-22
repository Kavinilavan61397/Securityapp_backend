const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app/api/auth';
const BUILDING_ID = '68b04099951cc19873fc3dd3';

async function testEmailLogin() {
  console.log('🚀 TESTING EMAIL + PASSWORD LOGIN SYSTEM');
  console.log('=' .repeat(50));
  
  // Test 1: Register a new user with email (no username)
  console.log('\n📝 STEP 1: REGISTER USER WITH EMAIL ONLY');
  console.log('-'.repeat(40));
  
  try {
    const registerResponse = await axios.post(`${BASE_URL}/register`, {
      name: 'Email Test User',
      email: 'emailtest@example.com',
      phoneNumber: '+919876543230',
      password: 'password123',
      role: 'SECURITY',
      employeeCode: 'SEC003',
      buildingId: BUILDING_ID
      // Note: No username provided
    });
    
    if (registerResponse.data.success) {
      console.log('✅ Registration successful (email only)');
      console.log(`   User ID: ${registerResponse.data.data.userId}`);
      console.log(`   Email: ${registerResponse.data.data.email}`);
      console.log(`   Username: ${registerResponse.data.data.username || 'Not provided'}`);
      console.log(`   Role: ${registerResponse.data.data.role}`);
    } else {
      console.log('❌ Registration failed:', registerResponse.data.message);
      return;
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message.includes('already exists')) {
      console.log('ℹ️  User already exists, proceeding with login test');
    } else {
      console.log('❌ Registration error:', error.response?.data?.message || error.message);
      return;
    }
  }
  
  // Test 2: Login with email + password (SECURITY - should get direct token)
  console.log('\n🔐 STEP 2: SECURITY LOGIN WITH EMAIL');
  console.log('-'.repeat(40));
  
  try {
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'emailtest@example.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Security login successful');
      console.log(`   Message: ${loginResponse.data.message}`);
      console.log(`   Requires OTP: ${loginResponse.data.data.requiresOtp}`);
      console.log(`   Has Token: ${!!loginResponse.data.data.token}`);
      console.log(`   Role: ${loginResponse.data.data.user?.role}`);
      console.log(`   Email: ${loginResponse.data.data.user?.email}`);
      console.log(`   Username: ${loginResponse.data.data.user?.username || 'Not set'}`);
    } else {
      console.log('❌ Security login failed:', loginResponse.data.message);
    }
  } catch (error) {
    console.log('❌ Security login error:', error.response?.data?.message || error.message);
  }
  
  // Test 3: Test existing resident with email login
  console.log('\n🏠 STEP 3: RESIDENT LOGIN WITH EMAIL');
  console.log('-'.repeat(40));
  
  try {
    const residentLoginResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'resident.test@example.com', // Use existing resident email
      password: 'password123'
    });
    
    if (residentLoginResponse.data.success) {
      console.log('✅ Resident login successful');
      console.log(`   Message: ${residentLoginResponse.data.message}`);
      console.log(`   Requires OTP: ${residentLoginResponse.data.data.requiresOtp}`);
      console.log(`   Has Token: ${!!residentLoginResponse.data.data.token}`);
      console.log(`   Role: ${residentLoginResponse.data.data.role}`);
      console.log(`   Email: ${residentLoginResponse.data.data.email}`);
    } else {
      console.log('❌ Resident login failed:', residentLoginResponse.data.message);
    }
  } catch (error) {
    console.log('❌ Resident login error:', error.response?.data?.message || error.message);
  }
  
  // Test 4: Test invalid email format
  console.log('\n🚫 STEP 4: INVALID EMAIL FORMAT TEST');
  console.log('-'.repeat(40));
  
  try {
    const invalidEmailResponse = await axios.post(`${BASE_URL}/login`, {
      email: 'invalid-email-format',
      password: 'password123'
    });
    
    console.log('❌ Invalid email should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid email format properly rejected');
      console.log(`   Message: ${error.response.data.message}`);
    } else {
      console.log('❌ Unexpected error for invalid email:', error.response?.data?.message || error.message);
    }
  }
  
  // Test 5: Test missing email
  console.log('\n🚫 STEP 5: MISSING EMAIL TEST');
  console.log('-'.repeat(40));
  
  try {
    const missingEmailResponse = await axios.post(`${BASE_URL}/login`, {
      password: 'password123'
    });
    
    console.log('❌ Missing email should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Missing email properly rejected');
      console.log(`   Message: ${error.response.data.message}`);
    } else {
      console.log('❌ Unexpected error for missing email:', error.response?.data?.message || error.message);
    }
  }
  
  console.log('\n🎯 EMAIL + PASSWORD LOGIN SYSTEM TEST COMPLETE!');
}

// Run the test
testEmailLogin().catch(console.error);
