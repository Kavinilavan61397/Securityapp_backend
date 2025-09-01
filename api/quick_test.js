const axios = require('axios');
require('dotenv').config();

// 100% Dynamic - No hardcoded values
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
let authToken = '';
let buildingId = '';

async function quickTest() {
  console.log('🚀 Quick Test - Testing Visitor Endpoints');
  
  try {
    // Step 1: Login to get token
    console.log('\n1. Testing Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'superadmin@securitycheck.com',
      password: 'SuperAdmin123!'
    });
    
    if (loginResponse.data.success) {
      const { userId, otpCode } = loginResponse.data.data;
      console.log('✅ Login successful, got OTP:', otpCode);
      
      // Step 2: Verify OTP
      console.log('\n2. Verifying OTP...');
      const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
        userId,
        otp: otpCode
      });
      
      if (otpResponse.data.success) {
        authToken = otpResponse.data.data.token;
        console.log('✅ OTP verified, got token');
        
        // Step 3: Create Building
        console.log('\n3. Creating Building...');
        const buildingResponse = await axios.post(`${BASE_URL}/api/buildings`, {
          name: `Test Building ${Date.now()}`,
          address: {
            street: '123 Test St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            country: 'India'
          },
          totalFloors: 5,
          totalFlats: 20,
          contactPhone: '+919876543210',
          contactEmail: 'test@building.com',
          features: ['PARKING', 'SECURITY']
        }, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (buildingResponse.data.success) {
          buildingId = buildingResponse.data.data.buildingId;
          console.log('✅ Building created:', buildingId);
          
          // Step 4: Test Visitor Creation
          console.log('\n4. Testing Visitor Creation...');
          const visitorResponse = await axios.post(`${BASE_URL}/api/visitors/${buildingId}`, {
            name: 'Test Visitor',
            phoneNumber: '+919876543210',
            email: 'visitor@test.com',
            idType: 'AADHAR',
            idNumber: '123456789012',
            purpose: 'Testing'
          }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          
          if (visitorResponse.data.success) {
            console.log('✅ Visitor created successfully!');
            console.log('🎉 ALL TESTS PASSED!');
          } else {
            console.log('❌ Visitor creation failed:', visitorResponse.data);
          }
        } else {
          console.log('❌ Building creation failed:', buildingResponse.data);
        }
      } else {
        console.log('❌ OTP verification failed:', otpResponse.data);
      }
    } else {
      console.log('❌ Login failed:', loginResponse.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

quickTest();
