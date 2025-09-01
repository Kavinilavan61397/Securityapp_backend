require("dotenv").config();

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function testSingleEndpoint() {
  console.log('🧪 Testing Single Visitor Endpoint');
  
  try {
    // Test just the GET /api/visitors/:buildingId endpoint
    const buildingId = '68b299f08912bc5a4ab1c2dc'; // Use your existing building ID
    
    console.log(`Testing GET /api/visitors/${buildingId}`);
    console.log('This should either work or fail quickly...');
    
    const response = await axios.get(`${BASE_URL}/api/visitors/${buildingId}`, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Authorization': 'Bearer INVALID_TOKEN_FOR_TESTING'
      }
    });
    
    console.log('✅ Response received:', response.status);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('❌ Request timed out after 10 seconds');
    } else if (error.response) {
      console.log('✅ Got response (expected auth error):', error.response.status);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testSingleEndpoint();
