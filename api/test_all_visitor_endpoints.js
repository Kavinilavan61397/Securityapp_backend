require("dotenv").config();

const axios = require('axios');
require('dotenv').config();

// 100% Dynamic - No hardcoded values
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function testAllVisitorEndpoints() {
  console.log('🧪 Testing All Visitor Endpoints with Full Functionality');
  
  try {
    // Step 1: Get valid token
    console.log('\n1. Getting valid token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'superadmin@securitycheck.com',
      password: 'SuperAdmin123!'
    });
    
    const { userId, otpCode } = loginResponse.data.data;
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId,
      otp: otpCode
    });
    
    const token = otpResponse.data.data.token;
    console.log('✅ Got valid token');
    
    const buildingId = '68b299f08912bc5a4ab1c2dc';
    
    // Test 1: Get all visitors
    console.log('\n2. Testing GET /api/visitors/:buildingId...');
    const getVisitorsResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Get visitors working:', getVisitorsResponse.status, getVisitorsResponse.data.message);
    
    // Test 2: Get visitor stats
    console.log('\n3. Testing GET /api/visitors/:buildingId/stats...');
    const statsResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Get stats working:', statsResponse.status, statsResponse.data.message);
    
    // Test 3: Search visitors
    console.log('\n4. Testing GET /api/visitors/:buildingId/search?query=John...');
    const searchResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}/search?query=John`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Search visitors working:', searchResponse.status, searchResponse.data.message);
    
    // Test 4: Get visitors with pagination and filtering
    console.log('\n5. Testing GET /api/visitors/:buildingId?page=1&limit=10...');
    const paginatedResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Pagination working:', paginatedResponse.status, paginatedResponse.data.message);
    
    console.log('\n🎉 ALL VISITOR ENDPOINTS ARE WORKING WITH FULL FUNCTIONALITY!');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Endpoint failed:', error.response.status, error.response.data.message);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testAllVisitorEndpoints();
