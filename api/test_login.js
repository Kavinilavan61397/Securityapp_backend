require("dotenv").config();
const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';
const API_BASE = `${BASE_URL}/api`;

async function testLogin() {
  try {
    console.log('🔐 Testing Login with Different Credentials...');
    
    // Test 1: Try with the credentials from the script
    console.log('\n📧 Test 1: Super Admin Login');
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'testsuper@test.com',
        phoneNumber: '+919876543210',
        role: 'SUPER_ADMIN'
      });
      
      console.log('✅ Super Admin Login successful');
      console.log('User ID:', loginResponse.data.data.userId);
      console.log('Email:', loginResponse.data.data.email);
      console.log('Role:', loginResponse.data.data.role);
      console.log('OTP Code (if available):', loginResponse.data.data.otpCode);
      
      if (loginResponse.data.data.otpCode) {
        console.log('\n🔢 Verifying OTP...');
        const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
          userId: loginResponse.data.data.userId,
          otp: loginResponse.data.data.otpCode
        });
        
        console.log('✅ OTP Verification successful');
        console.log('Token:', verifyResponse.data.data.token);
        
        // Test profile endpoint
        console.log('\n👤 Testing Profile Endpoint...');
        const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${verifyResponse.data.data.token}`
          }
        });
        
        console.log('✅ Profile Retrieved Successfully');
        console.log('Profile Data:', JSON.stringify(profileResponse.data, null, 2));
      }
      
    } catch (error) {
      console.log('❌ Super Admin Login failed:', error.response?.data?.message || error.message);
    }
    
    // Test 2: Try with resident credentials
    console.log('\n📧 Test 2: Resident Login');
    try {
      const residentLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'testresident@example.com',
        phoneNumber: '+919876543214',
        role: 'RESIDENT'
      });
      
      console.log('✅ Resident Login successful');
      console.log('User ID:', residentLoginResponse.data.data.userId);
      console.log('Email:', residentLoginResponse.data.data.email);
      console.log('Role:', residentLoginResponse.data.data.role);
      console.log('OTP Code (if available):', residentLoginResponse.data.data.otpCode);
      
    } catch (error) {
      console.log('❌ Resident Login failed:', error.response?.data?.message || error.message);
    }
    
    // Test 3: Try with the credentials you were using
    console.log('\n📧 Test 3: Your Credentials');
    try {
      const yourLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'testresident11@example.com',
        phoneNumber: '+919856543210',
        role: 'RESIDENT'
      });
      
      console.log('✅ Your Login successful');
      console.log('User ID:', yourLoginResponse.data.data.userId);
      console.log('Email:', yourLoginResponse.data.data.email);
      console.log('Role:', yourLoginResponse.data.data.role);
      console.log('OTP Code (if available):', yourLoginResponse.data.data.otpCode);
      
    } catch (error) {
      console.log('❌ Your Login failed:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ General Error:', error.message);
  }
}

testLogin();
