/**
 * SIMPLE ADMIN FLOW TEST
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testSimpleAdmin = async () => {
  try {
    console.log('🔍 Simple Admin Flow Test...');
    
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
    
    // Test 1: Employee Categories (should be simple - no DB)
    console.log('\n1. Testing Employee Categories...');
    try {
      const response = await axios.get(`${BASE_URL}/api/employees/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Employee Categories works:', response.data);
      
    } catch (error) {
      console.log('❌ Employee Categories failed:', error.response?.status, error.response?.data?.message);
    }
    
    // Test 2: Generate Employee Code (should be simple - no DB)
    console.log('\n2. Testing Generate Employee Code...');
    try {
      const response = await axios.get(`${BASE_URL}/api/employees/generate-code`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Generate Employee Code works:', response.data);
      
    } catch (error) {
      console.log('❌ Generate Employee Code failed:', error.response?.status, error.response?.data?.message);
    }
    
    // Test 3: Admin Dashboard (working)
    console.log('\n3. Testing Admin Dashboard...');
    try {
      const response = await axios.get(`${BASE_URL}/api/admin-dashboard/68b04099951cc19873fc3dd3`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Admin Dashboard works:', response.data.success);
      
    } catch (error) {
      console.log('❌ Admin Dashboard failed:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testSimpleAdmin();
