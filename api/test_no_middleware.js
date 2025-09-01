require("dotenv").config();

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function testNoMiddleware() {
  console.log('🧪 Testing Route Without Middleware');
  
  try {
    console.log('Testing GET /api/visitors/test-no-auth (no middleware)...');
    
    const response = await axios.get(`${BASE_URL}/api/visitors/test-no-auth`, {
      timeout: 5000
    });
    
    console.log('✅ Route without middleware working! Status:', response.status);
    console.log('Response:', response.data.message);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('❌ Route without middleware also hanging!');
    } else if (error.response) {
      console.log('✅ Got response:', error.response.status, error.response.data.message);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testNoMiddleware();
