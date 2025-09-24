/**
 * DEBUG MODEL CONNECTIONS
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testModelConnection = async () => {
  try {
    console.log('🔐 Testing model connections...');
    
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
    
    // Step 3: Test a working endpoint first
    console.log('\n🧪 Testing working endpoint: /api/buildings...');
    
    try {
      const buildingsResponse = await axios.get(`${BASE_URL}/api/buildings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Buildings endpoint works:', buildingsResponse.data.success);
      if (buildingsResponse.data.data && buildingsResponse.data.data.buildings) {
        console.log('   Building count:', buildingsResponse.data.data.buildings.length);
        if (buildingsResponse.data.data.buildings.length > 0) {
          const building = buildingsResponse.data.data.buildings[0];
          console.log('   First building adminId:', building.adminId);
        }
      }
    } catch (error) {
      console.log('❌ Buildings endpoint failed:', error.response?.status, error.response?.data?.message);
    }
    
    // Step 4: Test a simple admin endpoint with detailed error
    console.log('\n🧪 Testing admin endpoint with detailed error...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/employees/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Employee categories works:', response.data);
      
    } catch (error) {
      console.log('❌ Employee categories failed:');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
      console.log('   Error:', error.response?.data?.error);
      console.log('   Full response:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
};

testModelConnection();
