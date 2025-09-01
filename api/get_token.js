const axios = require('axios');
require('dotenv').config();

// 100% Dynamic - No hardcoded values
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const API_BASE = `${BASE_URL}/api`;

async function getToken() {
  try {
    // Login to get OTP
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'superadmin@test.com',
      phoneNumber: '+919876543210'
    });
    
    console.log('Login Response:', loginResponse.data);
    
    const { userId, otpCode } = loginResponse.data.data;
    
    // Verify OTP to get token
    const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
      userId: userId,
      otp: otpCode
    });
    
    console.log('Verify Response:', verifyResponse.data);
    
    const token = verifyResponse.data.data.token;
    console.log('\n✅ Token received:', token);
    
    // Test building creation with token
    const buildingResponse = await axios.post(`${API_BASE}/buildings`, {
      name: 'Test Building',
      address: {
        street: '123 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      },
      contactPhone: '+919876543211',
      contactEmail: 'test@building.com'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Building created:', buildingResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

getToken();
