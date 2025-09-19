const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function testAdminFlow() {
  console.log('🔍 Testing Admin Flow Endpoints...');
  
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
    
    // Test the previously failing endpoints
    const testEndpoints = [
      { name: 'Today Visits', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/today-visits' },
      { name: 'Recent Activity', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/recent-activity' },
      { name: 'Quick Actions', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/quick-actions' },
      { name: 'Get All Messages', url: '/api/messages/68b04099951cc19873fc3dd3' },
      { name: 'Previous Posts', url: '/api/messages/68b04099951cc19873fc3dd3/previous-posts' },
      { name: 'Approval Stats', url: '/api/resident-approvals/68b04099951cc19873fc3dd3/stats' }
    ];
    
    let working = 0;
    let failing = 0;
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ ${endpoint.name}: WORKING (${response.status})`);
        working++;
      } catch (error) {
        console.log(`❌ ${endpoint.name}: FAILED (${error.response?.status}) - ${error.response?.data?.message}`);
        failing++;
      }
    }
    
    console.log('\n📊 RESULTS:');
    console.log(`✅ Working: ${working}`);
    console.log(`❌ Failing: ${failing}`);
    console.log(`📈 Success Rate: ${((working / (working + failing)) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAdminFlow();
