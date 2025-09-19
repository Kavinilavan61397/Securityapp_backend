/**
 * TEST SINGLE DASHBOARD ENDPOINT
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testSingleDashboard = async () => {
  try {
    console.log('🔍 Testing Single Dashboard Endpoint...');
    
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
    
    // Test Today Visits endpoint
    console.log('\n📊 Testing Today Visits...');
    try {
      const response = await axios.get(`${BASE_URL}/api/admin-dashboard/68b04099951cc19873fc3dd3/today-visits`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Today Visits Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log('❌ Today Visits Error:', error.response?.status, error.response?.data?.message);
      console.log('Full error:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testSingleDashboard();
