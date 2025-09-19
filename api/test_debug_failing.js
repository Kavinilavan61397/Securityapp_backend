const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function debugFailingEndpoints() {
  console.log('🔍 Debugging the 3 Failing Endpoints...');
  console.log('=' .repeat(50));
  
  try {
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'buildingadmin@test.com',
      phoneNumber: '+919876543214',
      role: 'BUILDING_ADMIN'
    });
    
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: loginResponse.data.data.userId,
      otp: '1234'
    });
    
    const token = verifyResponse.data.data.token;
    console.log('✅ Authentication successful');
    
    // Test each failing endpoint with detailed error info
    const failingEndpoints = [
      { name: 'Recent Activity', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/recent-activity' },
      { name: 'Previous Posts', url: '/api/messages/68b04099951cc19873fc3dd3/previous-posts' },
      { name: 'Approval Stats', url: '/api/resident-approvals/68b04099951cc19873fc3dd3/stats' }
    ];
    
    for (const endpoint of failingEndpoints) {
      console.log(`\n🔍 Testing ${endpoint.name}...`);
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ ${endpoint.name}: SUCCESS (${response.status})`);
        console.log(`   Response keys: ${Object.keys(response.data.data || {}).join(', ')}`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: FAILED`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.data?.message}`);
        console.log(`   Error: ${error.response?.data?.error}`);
        
        // Check if there's a specific error in the response
        if (error.response?.data?.error && error.response.data.error !== 'Something went wrong') {
          console.log(`   Specific Error: ${error.response.data.error}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

debugFailingEndpoints();
