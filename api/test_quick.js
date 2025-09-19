const axios = require('axios');
const BASE_URL = 'https://securityapp-backend.vercel.app';

async function test() {
  try {
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
    
    const response = await axios.get(`${BASE_URL}/api/admin-dashboard/68b04099951cc19873fc3dd3/today-visits`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('SUCCESS:', response.status);
  } catch (error) {
    console.log('ERROR:', error.response?.status, error.response?.data?.message);
  }
}

test();
