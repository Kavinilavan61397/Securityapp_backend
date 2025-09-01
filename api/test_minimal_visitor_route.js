require("dotenv").config();

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function testMinimalVisitorRoute() {
  console.log('🧪 Testing Minimal Visitor Route');
  
  try {
    console.log('Testing GET /api/visitors/test (minimal route)...');
    
    const response = await axios.get(`${BASE_URL}/api/visitors/test`, {
      timeout: 5000
    });
    
    console.log('✅ Minimal visitor route working! Status:', response.status);
    console.log('Response:', response.data.message);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('❌ Minimal visitor route also hanging!');
    } else if (error.response) {
      console.log('✅ Got response:', error.response.status, error.response.data.message);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testMinimalVisitorRoute();
