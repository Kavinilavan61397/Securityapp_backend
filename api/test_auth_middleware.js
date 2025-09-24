/**
 * TEST AUTHENTICATION MIDDLEWARE
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testAuthMiddleware = async () => {
  try {
    console.log('🔐 Testing authentication middleware...');
    
    // Step 1: Login
    const credentials = {
      email: 'buildingadmin@test.com',
      phoneNumber: '+919876543214',
      role: 'BUILDING_ADMIN'
    };
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    console.log('✅ Login successful');
    
    // Step 2: Verify OTP
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: loginResponse.data.data.userId,
      otp: '1234'
    });
    
    const token = verifyResponse.data.data.token;
    console.log('✅ OTP verified, token received');
    console.log('Token:', token.substring(0, 50) + '...');
    
    // Step 3: Test with invalid token
    console.log('\n🧪 Testing with invalid token...');
    
    try {
      const invalidResponse = await axios.get(`${BASE_URL}/api/employees/categories`, {
        headers: {
          'Authorization': `Bearer invalid_token`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ Should have failed with invalid token');
      
    } catch (error) {
      console.log('✅ Invalid token correctly rejected:', error.response?.status, error.response?.data?.message);
    }
    
    // Step 4: Test with valid token
    console.log('\n🧪 Testing with valid token...');
    
    try {
      const validResponse = await axios.get(`${BASE_URL}/api/employees/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Valid token accepted:', validResponse.data.success);
      console.log('Response:', JSON.stringify(validResponse.data, null, 2));
      
    } catch (error) {
      console.log('❌ Valid token failed:', error.response?.status, error.response?.data?.message);
      console.log('Full error:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
};

testAuthMiddleware();
