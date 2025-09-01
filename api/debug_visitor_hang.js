const axios = require('axios');
require('dotenv').config();

// 100% Dynamic - No hardcoded values
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function debugVisitorHang() {
  console.log('🔍 Debugging Visitor Endpoint Hang');
  
  try {
    // Step 1: Get valid token
    console.log('\n1. Getting valid token...');
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
    
    // Step 3: Test visitor endpoint with detailed logging
    const buildingId = '68b299f08912bc5a4ab1c2dc';
    
    console.log(`\n3. Testing GET /api/visitors/${buildingId}`);
    console.log('This will either work or show us exactly where it hangs...');
    
    // Test with a very short timeout first
    const visitorResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}`, {
      timeout: 5000, // 5 second timeout
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Visitor endpoint working! Status:', visitorResponse.status);
    console.log('Response:', visitorResponse.data.message);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('❌ Request timed out after 5 seconds - Endpoint is hanging!');
      console.log('🔍 This means the issue is in the controller logic or database query');
    } else if (error.response) {
      console.log('✅ Got response but failed:', error.response.status, error.response.data.message);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

debugVisitorHang();
