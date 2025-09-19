/**
 * DEEP DEBUGGING FOR ADMIN FLOW 500 ERRORS
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testDeepDebug = async () => {
  try {
    console.log('🔍 Deep Debugging Admin Flow 500 Errors...');
    
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
    
    // Test basic endpoints that work vs failing ones
    console.log('\n📊 TESTING WORKING vs FAILING ENDPOINTS...');
    
    // Test a working endpoint first
    console.log('\n✅ Testing WORKING endpoint (Admin Dashboard)...');
    try {
      const workingResponse = await axios.get(`${BASE_URL}/api/admin-dashboard/68b04099951cc19873fc3dd3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Admin Dashboard: SUCCESS');
      console.log('   Response keys:', Object.keys(workingResponse.data.data || {}));
    } catch (error) {
      console.log('❌ Admin Dashboard: FAILED');
    }
    
    // Test failing endpoints with detailed error analysis
    const failingEndpoints = [
      { name: 'Today Visits', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/today-visits' },
      { name: 'Recent Activity', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/recent-activity' },
      { name: 'Quick Actions', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/quick-actions' },
      { name: 'Get All Messages', url: '/api/messages/68b04099951cc19873fc3dd3' },
      { name: 'Previous Posts', url: '/api/messages/68b04099951cc19873fc3dd3/previous-posts' },
      { name: 'Approval Stats', url: '/api/resident-approvals/68b04099951cc19873fc3dd3/stats' }
    ];
    
    for (const endpoint of failingEndpoints) {
      console.log(`\n❌ Testing FAILING endpoint: ${endpoint.name}...`);
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ ${endpoint.name}: SUCCESS (unexpected!)`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: FAILED`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.data?.message}`);
        console.log(`   Error: ${error.response?.data?.error}`);
        
        // Check if it's a specific error type
        if (error.response?.data?.error && error.response.data.error !== 'Something went wrong') {
          console.log(`   Specific Error: ${error.response.data.error}`);
        }
        
        // Check response headers for clues
        if (error.response?.headers) {
          console.log(`   Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
        }
      }
    }
    
    // Test if it's a database connection issue by testing a simple endpoint
    console.log('\n🔍 Testing database connectivity...');
    try {
      const dbTest = await axios.get(`${BASE_URL}/api/visitors/68b04099951cc19873fc3dd3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Database connectivity: OK');
    } catch (error) {
      console.log('❌ Database connectivity: FAILED');
      console.log(`   Error: ${error.response?.data?.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testDeepDebug();
