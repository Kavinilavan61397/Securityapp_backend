const axios = require('axios');

const baseURL = 'https://securityapp-backend.vercel.app';

const quickTest = async () => {
  console.log('🔍 Quick Base64 Route Test...\n');
  
  try {
    // Test if base64 route exists
    const response = await axios.post(`${baseURL}/api/user-profile/me/photo-base64`, {}, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    if (response.status === 401) {
      console.log('✅ Base64 route exists! (401 expected with invalid token)');
      console.log('📋 Use this in Postman:');
      console.log('POST https://securityapp-backend.vercel.app/api/user-profile/me/photo-base64');
    } else {
      console.log('📊 Response:', response.status, response.data);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
  }
};

quickTest();
