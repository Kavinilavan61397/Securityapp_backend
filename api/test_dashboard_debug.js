/**
 * DEBUG DASHBOARD ENDPOINT ISSUES
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testDashboardDebug = async () => {
  try {
    console.log('🔍 Debugging Dashboard Endpoints...');
    
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
    
    // Test each endpoint individually
    const endpoints = [
      { name: 'Today Visits', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/today-visits' },
      { name: 'Recent Activity', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/recent-activity' },
      { name: 'Quick Actions', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/quick-actions' },
      { name: 'Get All Messages', url: '/api/messages/68b04099951cc19873fc3dd3' },
      { name: 'Previous Posts', url: '/api/messages/68b04099951cc19873fc3dd3/previous-posts' },
      { name: 'Approval Stats', url: '/api/resident-approvals/68b04099951cc19873fc3dd3/stats' }
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n📊 Testing ${endpoint.name}...`);
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ ${endpoint.name}: SUCCESS`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Data keys: ${Object.keys(response.data.data || {}).join(', ')}`);
        
      } catch (error) {
        console.log(`❌ ${endpoint.name}: FAILED`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.data?.message}`);
        console.log(`   Error: ${error.response?.data?.error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testDashboardDebug();
