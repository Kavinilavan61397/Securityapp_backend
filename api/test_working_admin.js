/**
 * TEST WORKING ADMIN DASHBOARD
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testWorkingAdmin = async () => {
  try {
    console.log('🔍 Testing working Admin Dashboard...');
    
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
    
    // Test Admin Dashboard endpoints
    console.log('\n📊 TESTING ADMIN DASHBOARD ENDPOINTS...');
    
    const dashboardEndpoints = [
      '/api/admin-dashboard/68b04099951cc19873fc3dd3',
      '/api/admin-dashboard/68b04099951cc19873fc3dd3/today-visits',
      '/api/admin-dashboard/68b04099951cc19873fc3dd3/recent-activity',
      '/api/admin-dashboard/68b04099951cc19873fc3dd3/quick-actions'
    ];
    
    for (const endpoint of dashboardEndpoints) {
      try {
        console.log(`\n🧪 Testing ${endpoint}...`);
        
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ ${endpoint} works:`, response.data.success);
        if (response.data.data) {
          console.log(`   Data keys:`, Object.keys(response.data.data));
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint} failed:`, error.response?.status, error.response?.data?.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testWorkingAdmin();
