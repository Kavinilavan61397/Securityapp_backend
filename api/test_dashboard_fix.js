const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function testDashboardFix() {
  try {
    console.log('🔧 TESTING DASHBOARD FIX\n');

    // Step 1: Login as Security
    console.log('1️⃣ Logging in as Security...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'security@test.com',
      phoneNumber: '+919876543213',
      role: 'SECURITY'
    });

    console.log('✅ Login successful');
    const userId = loginResponse.data.data.userId;

    // Step 2: Verify OTP
    console.log('\n2️⃣ Verifying OTP...');
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      otp: '1234'
    });

    const token = otpResponse.data.data.token;
    console.log('✅ OTP verified successfully');

    // Step 3: Get user profile to check building assignment
    console.log('\n3️⃣ Getting user profile...');
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Profile retrieved');
    console.log('📋 User Details:', JSON.stringify(profileResponse.data, null, 2));

    const userBuildingId = profileResponse.data.data.buildingId;
    
    if (!userBuildingId) {
      console.log('❌ User has no building assignment!');
      return;
    }

    console.log(`🏢 User Building ID: ${userBuildingId}`);

    // Step 4: Test dashboard with correct building ID
    console.log('\n4️⃣ Testing dashboard with correct building ID...');
    const dashboardResponse = await axios.get(`${BASE_URL}/api/security/dashboard/${userBuildingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Dashboard working!');
    console.log('📋 Dashboard Response:', JSON.stringify(dashboardResponse.data, null, 2));

    // Step 5: Test other security endpoints
    console.log('\n5️⃣ Testing other security endpoints...');
    
    const todayVisitsResponse = await axios.get(`${BASE_URL}/api/security/today-visits/${userBuildingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Today visits working!');

    const recentActivityResponse = await axios.get(`${BASE_URL}/api/security/recent-activity/${userBuildingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Recent activity working!');

    const quickActionsResponse = await axios.get(`${BASE_URL}/api/security/quick-actions/${userBuildingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Quick actions working!');

    console.log('\n🎉 ALL SECURITY DASHBOARD ENDPOINTS WORKING!');
    console.log(`\n📝 CORRECT BUILDING ID TO USE: ${userBuildingId}`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 SOLUTION:');
      console.log('1. Make sure you\'re using the correct building ID');
      console.log('2. Make sure the user has a building assignment');
      console.log('3. Check if the security dashboard routes are properly deployed');
    }
  }
}

testDashboardFix();
