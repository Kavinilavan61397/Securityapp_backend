/**
 * DEBUG OTP SYSTEM
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testOTP = async () => {
  try {
    console.log('🔐 Testing OTP system...');
    
    const credentials = {
      email: 'buildingadmin@test.com',
      phoneNumber: '+919876543214',
      role: 'BUILDING_ADMIN'
    };
    
    // Step 1: Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    console.log('✅ Login Response:');
    console.log(JSON.stringify(loginResponse.data, null, 2));
    
    const userId = loginResponse.data.data.userId;
    
    // Try different OTPs
    const testOTPs = ['123456', '0000', '1111', '1234', '000000', '111111'];
    
    for (const otp of testOTPs) {
      try {
        console.log(`\n🔑 Trying OTP: ${otp}`);
        const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
          userId: userId,
          otp: otp
        });
        console.log(`✅ OTP ${otp} worked!`);
        console.log(JSON.stringify(verifyResponse.data, null, 2));
        break;
      } catch (error) {
        console.log(`❌ OTP ${otp} failed: ${error.response?.data?.message || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

testOTP();
