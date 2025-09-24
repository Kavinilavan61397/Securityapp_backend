const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app/api/auth';

async function testSecurityLogin() {
  try {
    console.log('🔐 Testing SECURITY login (should get direct token)...');
    const response = await axios.post(`${BASE_URL}/login`, {
      username: 'securitykakka',
      password: 'password123'
    });
    
    if (response.data.success) {
      console.log('✅ Security login successful');
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Requires OTP: ${response.data.data.requiresOtp}`);
      console.log(`   Has Token: ${response.data.data.token ? 'Yes' : 'No'}`);
      console.log(`   Role: ${response.data.data.user?.role}`);
      return true;
    } else {
      console.log('❌ Security login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Security login error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testBuildingAdminLogin() {
  try {
    console.log('\n🏢 Testing BUILDING_ADMIN login (should get direct token)...');
    const response = await axios.post(`${BASE_URL}/login`, {
      username: 'buildingadmin',
      password: 'password123'
    });
    
    if (response.data.success) {
      console.log('✅ Building Admin login successful');
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Requires OTP: ${response.data.data.requiresOtp}`);
      console.log(`   Has Token: ${response.data.data.token ? 'Yes' : 'No'}`);
      console.log(`   Role: ${response.data.data.user?.role}`);
      return true;
    } else {
      console.log('❌ Building Admin login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Building Admin login error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testResidentLogin() {
  try {
    console.log('\n🏠 Testing RESIDENT login (should get OTP flow)...');
    const response = await axios.post(`${BASE_URL}/login`, {
      username: 'residentkakka',
      password: 'password123'
    });
    
    if (response.data.success) {
      console.log('✅ Resident login successful');
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Requires OTP: ${response.data.data.requiresOtp}`);
      console.log(`   Has Token: ${response.data.data.token ? 'Yes' : 'No'}`);
      console.log(`   Has User ID: ${response.data.data.userId ? 'Yes' : 'No'}`);
      console.log(`   Role: ${response.data.data.role}`);
      return true;
    } else {
      console.log('❌ Resident login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Resident login error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runSimpleTest() {
  console.log('🚀 TESTING ROLE-BASED AUTHENTICATION');
  console.log('=' .repeat(50));
  
  const securityResult = await testSecurityLogin();
  const adminResult = await testBuildingAdminLogin();
  const residentResult = await testResidentLogin();
  
  console.log('\n📊 RESULTS:');
  console.log(`🔐 Security (Direct Token): ${securityResult ? '✅' : '❌'}`);
  console.log(`🏢 Building Admin (Direct Token): ${adminResult ? '✅' : '❌'}`);
  console.log(`🏠 Resident (OTP Flow): ${residentResult ? '✅' : '❌'}`);
  
  if (securityResult && adminResult && residentResult) {
    console.log('\n🎉 ALL ROLE-BASED AUTHENTICATION TESTS PASSED!');
  } else {
    console.log('\n❌ Some tests failed - check the output above');
  }
}

runSimpleTest().catch(console.error);
