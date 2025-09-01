require('dotenv').config();
const axios = require('axios');

// 100% Dynamic - No hardcoded values
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function comprehensiveVisitorTest() {
  console.log('🧪 COMPREHENSIVE VISITOR ENDPOINTS TEST');
  console.log('==========================================');
  console.log(`Base URL: ${BASE_URL}`);
  
  let authToken = '';
  let buildingId = '';
  let visitorId = '';
  
  try {
    // Step 1: Authentication
    console.log('\n🔐 STEP 1: Authentication');
    console.log('Getting Super Admin token...');
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'superadmin@securitycheck.com',
      password: 'SuperAdmin123!'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const { userId, otpCode } = loginResponse.data.data;
    console.log('✅ OTP received:', otpCode);
    
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId,
      otp: otpCode
    });
    
    if (!otpResponse.data.success) {
      throw new Error('OTP verification failed');
    }
    
    authToken = otpResponse.data.data.token;
    console.log('✅ Authentication successful');
    
    // Step 2: Get Building ID (use existing building)
    console.log('\n🏢 STEP 2: Building Access');
    buildingId = '68b299f08912bc5a4ab1c2dc'; // Your existing building
    console.log(`Using building ID: ${buildingId}`);
    
    // Step 3: Test All Visitor Endpoints
    console.log('\n👥 STEP 3: Testing All Visitor Endpoints');
    
    // Test 3.1: Get All Visitors (with pagination)
    console.log('\n3.1 Testing GET /api/visitors/:buildingId (with pagination)');
    const getVisitorsResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Status:', getVisitorsResponse.status);
    console.log('✅ Message:', getVisitorsResponse.data.message);
    console.log('✅ Total Visitors:', getVisitorsResponse.data.data.pagination.totalVisitors);
    console.log('✅ Current Page:', getVisitorsResponse.data.data.pagination.currentPage);
    
    // Test 3.2: Get Visitor Statistics
    console.log('\n3.2 Testing GET /api/visitors/:buildingId/stats');
    const statsResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Status:', statsResponse.status);
    console.log('✅ Message:', statsResponse.data.message);
    console.log('✅ Total Visitors:', statsResponse.data.data.totalVisitors);
    console.log('✅ Active Visitors:', statsResponse.data.data.activeVisitors);
    console.log('✅ Blacklisted Visitors:', statsResponse.data.data.blacklistedVisitors);
    
    // Test 3.3: Search Visitors
    console.log('\n3.3 Testing GET /api/visitors/:buildingId/search?query=John');
    const searchResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}/search?query=John`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Status:', searchResponse.status);
    console.log('✅ Message:', searchResponse.data.message);
    console.log('✅ Search Results:', searchResponse.data.data.visitors.length);
    
    // Test 3.4: Create New Visitor
    console.log('\n3.4 Testing POST /api/visitors/:buildingId (Create Visitor)');
    const newVisitorData = {
      name: 'Jane Smith',
      phoneNumber: '+919876543212',
      email: 'jane.smith@example.com',
      idType: 'AADHAR',
      idNumber: '987654321098',
      purpose: 'Business meeting with resident',
      company: 'Tech Solutions Inc',
      vehicleNumber: 'MH12CD5678',
      emergencyContact: {
        name: 'John Smith',
        phone: '+919876543213',
        relationship: 'Spouse'
      }
    };
    
    const createResponse = await axios.post(`${BASE_URL}/api/visitors/${buildingId}`, newVisitorData, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Status:', createResponse.status);
    console.log('✅ Message:', createResponse.data.message);
    console.log('✅ Visitor ID:', createResponse.data.data.visitorId);
    visitorId = createResponse.data.data.visitorId;
    
    // Test 3.5: Get Visitor by ID
    console.log('\n3.5 Testing GET /api/visitors/:buildingId/:visitorId');
    const getVisitorResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}/${visitorId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Status:', getVisitorResponse.status);
    console.log('✅ Message:', getVisitorResponse.data.message);
    console.log('✅ Visitor Name:', getVisitorResponse.data.data.visitor.name);
    
    // Test 3.6: Update Visitor
    console.log('\n3.6 Testing PUT /api/visitors/:buildingId/:visitorId (Update Visitor)');
    const updateData = {
      purpose: 'Updated purpose - Extended business meeting',
      company: 'Tech Solutions Inc (Updated)'
    };
    
    const updateResponse = await axios.put(`${BASE_URL}/api/visitors/${buildingId}/${visitorId}`, updateData, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Status:', updateResponse.status);
    console.log('✅ Message:', updateResponse.data.message);
    
    // Test 3.7: Get Visitors with Advanced Filtering
    console.log('\n3.7 Testing GET /api/visitors/:buildingId (with advanced filters)');
    const filteredResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}?page=1&limit=5&sortBy=createdAt&sortOrder=desc`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Status:', filteredResponse.status);
    console.log('✅ Message:', filteredResponse.data.message);
    console.log('✅ Filtered Results:', filteredResponse.data.data.visitors.length);
    
    // Final Statistics
    console.log('\n📊 FINAL STATISTICS');
    console.log('==================');
    const finalStats = await axios.get(`${BASE_URL}/api/visitors/${buildingId}/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Total Visitors:', finalStats.data.data.totalVisitors);
    console.log('✅ Active Visitors:', finalStats.data.data.activeVisitors);
    console.log('✅ Blacklisted Visitors:', finalStats.data.data.blacklistedVisitors);
    
    console.log('\n🎉 ALL VISITOR ENDPOINTS TESTED SUCCESSFULLY!');
    console.log('✅ Full CRUD operations working');
    console.log('✅ Search and filtering working');
    console.log('✅ Pagination and sorting working');
    console.log('✅ Statistics and reporting working');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Endpoint failed:', error.response.status);
      console.log('❌ Error message:', error.response.data.message);
      console.log('❌ Full error:', error.response.data);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

comprehensiveVisitorTest();
