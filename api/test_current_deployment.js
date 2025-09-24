const axios = require('axios');

const baseURL = 'https://securityapp-backend.vercel.app';

const testCurrentDeployment = async () => {
  console.log('🔍 Testing Current Vercel Deployment...\n');
  
  try {
    // Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`, { timeout: 10000 });
    console.log('✅ Health:', healthResponse.data);
    
    // Test available endpoints
    console.log('\n2️⃣ Testing available endpoints...');
    const endpointsResponse = await axios.get(`${baseURL}/`, { timeout: 10000 });
    console.log('📋 Available endpoints:', endpointsResponse.data);
    
    // Test if userProfile routes exist
    console.log('\n3️⃣ Testing userProfile routes...');
    try {
      const userProfileResponse = await axios.get(`${baseURL}/api/user-profile/me`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (userProfileResponse.status === 401) {
        console.log('✅ userProfile routes exist (401 expected with invalid token)');
      } else {
        console.log('📊 userProfile response:', userProfileResponse.status, userProfileResponse.data);
      }
    } catch (error) {
      console.log('❌ userProfile routes not found:', error.response?.data?.message || error.message);
    }
    
    // Test if base64 routes exist
    console.log('\n4️⃣ Testing base64 routes...');
    try {
      const base64Response = await axios.post(`${baseURL}/api/user-profile/me/photo-base64`, {}, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      if (base64Response.status === 401) {
        console.log('✅ base64 routes exist (401 expected with invalid token)');
      } else {
        console.log('📊 base64 response:', base64Response.status, base64Response.data);
      }
    } catch (error) {
      console.log('❌ base64 routes not found:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ Deployment test failed:', error.response?.data || error.message);
  }
};

testCurrentDeployment();
