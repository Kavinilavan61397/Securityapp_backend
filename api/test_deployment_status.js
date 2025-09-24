/**
 * TEST DEPLOYMENT STATUS
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testDeploymentStatus = async () => {
  try {
    console.log('🔍 Testing deployment status...');
    
    // Test 1: Check if API base endpoint works
    console.log('\n1. Testing API base endpoint...');
    try {
      const baseResponse = await axios.get(`${BASE_URL}/api`);
      console.log('✅ API base endpoint works');
      console.log('Available endpoints:', Object.keys(baseResponse.data.endpoints));
      
      // Check if admin endpoints are listed
      const adminEndpoints = [
        'employees',
        'residentApprovals', 
        'adminDashboard',
        'messages'
      ];
      
      console.log('\nAdmin endpoints status:');
      adminEndpoints.forEach(endpoint => {
        const isListed = baseResponse.data.endpoints[endpoint];
        console.log(`   ${endpoint}: ${isListed ? '✅ Listed' : '❌ Not listed'}`);
      });
      
    } catch (error) {
      console.log('❌ API base endpoint failed:', error.message);
    }
    
    // Test 2: Check if admin routes are accessible
    console.log('\n2. Testing admin route accessibility...');
    
    const adminRoutes = [
      '/api/employees/categories',
      '/api/employees/generate-code',
      '/api/admin-dashboard/68b04099951cc19873fc3dd3',
      '/api/messages/68b04099951cc19873fc3dd3',
      '/api/resident-approvals/68b04099951cc19873fc3dd3'
    ];
    
    for (const route of adminRoutes) {
      try {
        const response = await axios.get(`${BASE_URL}${route}`);
        console.log(`✅ ${route} - Accessible (${response.status})`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`🔐 ${route} - Requires auth (${error.response.status})`);
        } else if (error.response?.status === 404) {
          console.log(`❌ ${route} - Not found (${error.response.status})`);
        } else {
          console.log(`⚠️  ${route} - Error (${error.response?.status || 'No response'})`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testDeploymentStatus();
