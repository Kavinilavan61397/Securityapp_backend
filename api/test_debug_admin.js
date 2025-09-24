/**
 * DEBUG ADMIN FLOW ISSUES
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testDebugAdmin = async () => {
  try {
    console.log('🔍 Debugging Admin Flow issues...');
    
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
    
    // Test 2: Test a working endpoint first
    console.log('\n1. Testing working endpoint...');
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
    
    // Approach 1: Test with different HTTP methods
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    
    for (const method of methods) {
      try {
        console.log(`\n   Testing ${method} /api/employees/categories...`);
        
        const response = await axios({
          method: method,
          url: `${BASE_URL}/api/employees/categories`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`   ✅ ${method} works:`, response.data.success);
        
      } catch (error) {
        console.log(`   ❌ ${method} failed:`, error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 4: Test with different admin endpoints
    console.log('\n3. Testing different admin endpoints...');
    
    const adminEndpoints = [
      '/api/employees/categories',
      '/api/employees/generate-code',
      '/api/admin-dashboard/68b04099951cc19873fc3dd3',
      '/api/messages/68b04099951cc19873fc3dd3',
      '/api/resident-approvals/68b04099951cc19873fc3dd3'
    ];
    
    for (const endpoint of adminEndpoints) {
      try {
        console.log(`\n   Testing ${endpoint}...`);
        
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`   ✅ ${endpoint} works:`, response.data.success);
        
      } catch (error) {
        console.log(`   ❌ ${endpoint} failed:`, error.response?.status, error.response?.data?.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testDebugAdmin();
