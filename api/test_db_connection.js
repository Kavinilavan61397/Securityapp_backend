/**
 * TEST DATABASE CONNECTION
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testDatabaseConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test 1: Check database health
    console.log('\n1. Testing database health...');
    try {
      const dbResponse = await axios.get(`${BASE_URL}/db-health`);
      console.log('✅ Database health check:', dbResponse.data);
    } catch (error) {
      console.log('❌ Database health check failed:', error.message);
    }
    
    // Test 2: Test a working endpoint that uses database
    console.log('\n2. Testing working database endpoint...');
    try {
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
      
      // Test buildings endpoint (which uses database)
      const buildingsResponse = await axios.get(`${BASE_URL}/api/buildings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Buildings endpoint works (uses database):', buildingsResponse.data.success);
      console.log('   Building count:', buildingsResponse.data.data.buildings.length);
      
    } catch (error) {
      console.log('❌ Working database endpoint failed:', error.message);
    }
    
    // Test 3: Test admin endpoint with detailed error logging
    console.log('\n3. Testing admin endpoint with detailed error...');
    try {
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
      
      // Test admin endpoint
      const adminResponse = await axios.get(`${BASE_URL}/api/employees/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Admin endpoint works:', adminResponse.data);
      
    } catch (error) {
      console.log('❌ Admin endpoint failed:');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
      console.log('   Error:', error.response?.data?.error);
      
      // Check if it's a database connection issue
      if (error.response?.data?.error?.includes('database') || 
          error.response?.data?.error?.includes('connection') ||
          error.response?.data?.error?.includes('timeout')) {
        console.log('   🔍 This looks like a database connection issue');
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testDatabaseConnection();
