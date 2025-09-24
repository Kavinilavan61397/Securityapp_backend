/**
 * TEST MIDDLEWARE DEBUG
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testMiddlewareDebug = async () => {
  try {
    console.log('🔍 Testing middleware debug...');
    
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
    
    // Test 2: Test a working endpoint with same auth
    console.log('\n1. Testing working endpoint with same auth...');
    try {
      const buildingsResponse = await axios.get(`${BASE_URL}/api/buildings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Buildings endpoint works:', buildingsResponse.data.success);
      
    } catch (error) {
      console.log('❌ Buildings endpoint failed:', error.response?.data?.message);
    }
    
    // Test 3: Test admin endpoint with different approaches
    console.log('\n2. Testing admin endpoint approaches...');
    
    // Approach 1: Direct call
    try {
      const directResponse = await axios.get(`${BASE_URL}/api/employees/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Direct call works:', directResponse.data);
      
    } catch (error) {
      console.log('❌ Direct call failed:', error.response?.status, error.response?.data?.message);
    }
    
    // Approach 2: Test with different HTTP method
    try {
      const postResponse = await axios.post(`${BASE_URL}/api/employees/categories`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ POST call works:', postResponse.data);
      
    } catch (error) {
      console.log('❌ POST call failed:', error.response?.status, error.response?.data?.message);
    }
    
    // Approach 3: Test with different endpoint
    try {
      const generateResponse = await axios.get(`${BASE_URL}/api/employees/generate-code`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Generate code works:', generateResponse.data);
      
    } catch (error) {
      console.log('❌ Generate code failed:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testMiddlewareDebug();
