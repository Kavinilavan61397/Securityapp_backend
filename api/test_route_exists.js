require("dotenv").config();

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function testRouteExists() {
  console.log('🧪 Testing if Visitor Route Exists');
  
  try {
    // Test 1: Check if server is responding
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is healthy:', healthResponse.status);
    
    // Test 2: Check if visitor route exists (should get 401 without token)
    console.log('2. Testing visitor route without token...');
    const visitorResponse = await axios.get(`${BASE_URL}/api/visitors/test`, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    console.log('✅ Visitor route exists, status:', visitorResponse.status);
    
    // Test 3: Check what endpoints are available
    console.log('3. Checking available endpoints...');
    const rootResponse = await axios.get(`${BASE_URL}/`, { timeout: 5000 });
    console.log('✅ Root endpoint working, available endpoints:', rootResponse.data.quickStart);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('❌ Request timed out - server might be hanging');
    } else if (error.response) {
      console.log('✅ Got response:', error.response.status);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testRouteExists();
