const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testFinalAdmin = async () => {
  try {
    console.log('🚀 FINAL ADMIN FLOW TEST');
    console.log('=' .repeat(50));
    
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
    
    // Test all Admin Flow endpoints
    const endpoints = [
      { name: 'Employee Categories', url: '/api/employees/categories' },
      { name: 'Generate Employee Code', url: '/api/employees/generate-code' },
      { name: 'Get All Employees', url: '/api/employees/68b04099951cc19873fc3dd3' },
      { name: 'Admin Dashboard', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3' },
      { name: 'Today Visits', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/today-visits' },
      { name: 'Recent Activity', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/recent-activity' },
      { name: 'Quick Actions', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/quick-actions' },
      { name: 'Get All Messages', url: '/api/messages/68b04099951cc19873fc3dd3' },
      { name: 'Previous Posts', url: '/api/messages/68b04099951cc19873fc3dd3/previous-posts' },
      { name: 'Get All Approvals', url: '/api/resident-approvals/68b04099951cc19873fc3dd3' },
      { name: 'Pending Count', url: '/api/resident-approvals/68b04099951cc19873fc3dd3/pending/count' },
      { name: 'Approval Stats', url: '/api/resident-approvals/68b04099951cc19873fc3dd3/stats' }
    ];
    
    let working = 0;
    let failing = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ ${endpoint.name}: WORKING`);
        working++;
      } catch (error) {
        console.log(`❌ ${endpoint.name}: FAILED (${error.response?.status})`);
        failing++;
      }
    }
    
    console.log('\n🎉 FINAL RESULTS:');
    console.log('=' .repeat(50));
    console.log(`✅ Working: ${working}`);
    console.log(`❌ Failing: ${failing}`);
    console.log(`📊 Success Rate: ${((working / (working + failing)) * 100).toFixed(1)}%`);
    
    if (failing === 0) {
      console.log('\n🎉 ALL ADMIN FLOW ENDPOINTS ARE WORKING!');
    } else {
      console.log(`\n⚠️  ${failing} endpoint(s) still need fixing.`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testFinalAdmin();
