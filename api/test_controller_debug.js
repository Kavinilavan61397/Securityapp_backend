/**
 * TEST CONTROLLER DEBUG
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testControllerDebug = async () => {
  try {
    console.log('🔍 Testing controller debug...');
    
    // Step 1: Login
    const credentials = {
      email: 'buildingadmin@test.com',
      phoneNumber: '+919876543214',
      role: 'BUILDING_ADMIN'
    };
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: loginResponse.data.data.userId,
      otp: '1234'
    });
    
    const token = verifyResponse.data.data.token;
    console.log('✅ Authentication successful');
    
    // Test 2: Test with detailed error logging
    console.log('\n1. Testing with detailed error logging...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/employees/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Success:', response.data);
      
    } catch (error) {
      console.log('❌ Error details:');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
      console.log('   Error:', error.response?.data?.error);
      console.log('   Headers:', error.response?.headers);
      
      // Check if it's a timeout issue
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.log('   🔍 This looks like a timeout issue');
      }
      
      // Check if it's a server error
      if (error.response?.status >= 500) {
        console.log('   🔍 This is a server error (5xx)');
      }
    }
    
    // Test 3: Test with different endpoint to see if it's specific to this endpoint
    console.log('\n2. Testing different admin endpoint...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/admin-dashboard/68b04099951cc19873fc3dd3`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Admin dashboard works:', response.data);
      
    } catch (error) {
      console.log('❌ Admin dashboard failed:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testControllerDebug();
