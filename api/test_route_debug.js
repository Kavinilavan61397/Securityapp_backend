/**
 * DEBUG ROUTE PATHS
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testRoutes = async () => {
  try {
    console.log('🔐 Testing route paths...');
    
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
    
    // Step 3: Test different route paths
    const routes = [
      '/api/employees/categories',
      '/api/employees/generate-code',
      '/api/admin-dashboard/68b04099951cc19873fc3dd3',
      '/api/messages/68b04099951cc19873fc3dd3',
      '/api/resident-approvals/68b04099951cc19873fc3dd3'
    ];
    
    for (const route of routes) {
      try {
        console.log(`\n🧪 Testing ${route}...`);
        
        const response = await axios.get(`${BASE_URL}${route}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ ${route} - Success:`, response.data.success);
        if (response.data.data) {
          console.log(`   Data keys:`, Object.keys(response.data.data));
        }
        
      } catch (error) {
        console.log(`❌ ${route} - Error:`, error.response?.status, error.response?.data?.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
};

testRoutes();
