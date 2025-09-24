const axios = require('axios');

// Replace with your actual Vercel URL
const VERCEL_URL = process.env.VERCEL_URL || 'https://your-app-name.vercel.app';

const verifyDeployment = async () => {
  console.log('🔍 Verifying Vercel Deployment...\n');
  console.log(`🌐 Checking: ${VERCEL_URL}\n`);
  
  try {
    // Test 1: Basic health check
    console.log('1️⃣ Testing basic health...');
    const healthResponse = await axios.get(`${VERCEL_URL}/api/health`, { timeout: 10000 });
    console.log('✅ Health check passed');
    console.log('📊 Status:', healthResponse.data.status);
    
    // Test 2: Check API endpoints
    console.log('\n2️⃣ Testing API endpoints...');
    const apiResponse = await axios.get(`${VERCEL_URL}/api`, { timeout: 10000 });
    console.log('✅ API endpoint accessible');
    
    // Check if user profile routes are available
    const quickStart = apiResponse.data.quickStart || {};
    if (quickStart.userProfile) {
      console.log('✅ User profile routes detected!');
      console.log('🔗 User profile endpoint:', quickStart.userProfile);
    } else {
      console.log('⚠️ User profile routes not found in API response');
    }
    
    // Test 3: Check if user profile controller exists
    console.log('\n3️⃣ Testing user profile endpoint...');
    try {
      const profileResponse = await axios.get(`${VERCEL_URL}/api/user-profile/me`, {
        headers: { 'Authorization': 'Bearer invalid-token' },
        timeout: 10000
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ User profile endpoint exists (401 Unauthorized expected)');
      } else if (error.response?.status === 404) {
        console.log('❌ User profile endpoint not found (404)');
      } else {
        console.log('⚠️ User profile endpoint responded with:', error.response?.status);
      }
    }
    
    console.log('\n🎉 Deployment verification completed!');
    console.log('\n📋 Available endpoints:');
    Object.entries(quickStart).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
  } catch (error) {
    console.error('❌ Deployment verification failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Make sure your Vercel URL is correct');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Check if your Vercel deployment is running');
    } else if (error.response?.status === 404) {
      console.log('💡 Check if your API routes are properly deployed');
    }
  }
};

// Run verification
verifyDeployment();
