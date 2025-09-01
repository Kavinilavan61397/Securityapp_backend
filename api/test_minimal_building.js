require("dotenv").config();

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const API_BASE = `${BASE_URL}/api`;

async function testMinimalBuilding() {
  try {
    // Login to get OTP
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'testsuper@test.com',
      phoneNumber: '+919876543210'
    });
    
    const { userId, otpCode } = loginResponse.data.data;
    
    // Verify OTP to get token
    const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
      userId: userId,
      otp: otpCode
    });
    
    const token = verifyResponse.data.data.token;
    console.log('✅ Token received');
    
    // Test minimal building creation
    const buildingData = {
      name: 'Test Building',
      address: {
        street: '123 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      },
      contactPhone: '+919876543211',
      contactEmail: 'test@building.com'
    };
    
    console.log('🏗️  Creating building with data:', JSON.stringify(buildingData, null, 2));
    
    const buildingResponse = await axios.post(`${API_BASE}/buildings`, buildingData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Building created successfully:', buildingResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('🔍 Detailed error:', error.response.data.error);
    }
  }
}

testMinimalBuilding();
