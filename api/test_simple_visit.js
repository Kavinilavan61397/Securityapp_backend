/**
 * SIMPLE VISIT TEST TO ISOLATE THE ISSUE
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testSimpleVisit = async () => {
  try {
    console.log('🔍 Testing Simple Visit Query...');
    
    // Step 1: Login
    const credentials = {
      email: 'buildingadmin@test.com',
      phoneNumber: '+919876543214',
      role: 'BUILDING_ADMIN'
    };
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: loginResponse.data.data.userId,
      otp: '1234'
    });
    
    const token = verifyResponse.data.data.token;
    console.log('✅ Authentication successful');
    
    // Test basic visit endpoint that should work
    console.log('\n📊 Testing basic visit endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/api/visits/68b04099951cc19873fc3dd3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Basic visits endpoint: SUCCESS');
      console.log(`   Found ${response.data.data.visits.length} visits`);
    } catch (error) {
      console.log('❌ Basic visits endpoint: FAILED');
      console.log(`   Error: ${error.response?.data?.message}`);
    }
    
    // Test if the issue is with date range calculation
    console.log('\n📅 Testing date range calculation...');
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    console.log('Today:', today);
    console.log('Start of day:', startOfDay);
    console.log('End of day:', endOfDay);
    
    // Test if the issue is with the specific building ID
    console.log('\n🏢 Testing building ID...');
    try {
      const buildingResponse = await axios.get(`${BASE_URL}/api/buildings/68b04099951cc19873fc3dd3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Building exists: SUCCESS');
    } catch (error) {
      console.log('❌ Building check: FAILED');
      console.log(`   Error: ${error.response?.data?.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testSimpleVisit();
