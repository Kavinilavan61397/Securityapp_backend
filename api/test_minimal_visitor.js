require("dotenv").config();

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function testMinimalVisitor() {
  console.log('🧪 Testing Minimal Visitor Endpoint');
  
  try {
    // Get token
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'superadmin@securitycheck.com',
      password: 'SuperAdmin123!'
    });
    
    const { userId, otpCode } = loginResponse.data.data;
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId,
      otp: otpCode
    });
    
    const token = otpResponse.data.data.token;
    console.log('✅ Got token');
    
    // Test with a very simple endpoint first
    const buildingId = '68b299f08912bc5a4ab1c2dc';
    
    console.log('Testing simple visitor endpoint...');
    
    // Test 1: Just the route without any database query
    const response = await axios.get(`${BASE_URL}/api/visitors/${buildingId}/stats`, {
      timeout: 5000,
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Stats endpoint working!');
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('❌ Stats endpoint also hanging!');
    } else if (error.response) {
      console.log('✅ Got response:', error.response.status, error.response.data.message);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testMinimalVisitor();
