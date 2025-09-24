/**
 * DEBUG AUTHENTICATION RESPONSE
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testAuth = async () => {
  try {
    console.log('🔐 Testing authentication...');
    
    const credentials = {
      email: 'buildingadmin@test.com',
      phoneNumber: '+919876543214',
      role: 'BUILDING_ADMIN'
    };
    
    // Step 1: Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    console.log('✅ Login Response:');
    console.log(JSON.stringify(loginResponse.data, null, 2));
    
    // Check if user exists
    if (loginResponse.data.data && loginResponse.data.data.user) {
      console.log('\n📋 User object structure:');
      console.log('Keys:', Object.keys(loginResponse.data.data.user));
      console.log('User ID field:', loginResponse.data.data.user._id || loginResponse.data.data.user.id);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

testAuth();
