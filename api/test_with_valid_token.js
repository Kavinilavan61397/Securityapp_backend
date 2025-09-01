require("dotenv").config();

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function testWithValidToken() {
  console.log('🧪 Testing Visitor Endpoint with Valid Token');
  
  try {
    // Step 1: Get valid token
    console.log('1. Getting valid token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'superadmin@securitycheck.com',
      password: 'SuperAdmin123!'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }
    
    const { userId, otpCode } = loginResponse.data.data;
    console.log('✅ Got OTP:', otpCode);
    
    // Step 2: Verify OTP
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId,
      otp: otpCode
    });
    
    if (!otpResponse.data.success) {
      console.log('❌ OTP verification failed');
      return;
    }
    
    const token = otpResponse.data.data.token;
    console.log('✅ Got valid token');
    
    // Step 3: Test visitor endpoint with valid token
    const buildingId = '68b299f08912bc5a4ab1c2dc'; // Your existing building
    
    console.log(`3. Testing GET /api/visitors/${buildingId} with valid token...`);
    
    const visitorResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}`, {
      timeout: 15000, // 15 second timeout
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Visitor endpoint working! Status:', visitorResponse.status);
    console.log('Response:', visitorResponse.data.message);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('❌ Request timed out after 15 seconds');
    } else if (error.response) {
      console.log('❌ Got response but failed:', error.response.status, error.response.data.message);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testWithValidToken();
