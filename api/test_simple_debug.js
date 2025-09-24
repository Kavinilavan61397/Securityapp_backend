const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function testSimpleDebug() {
  console.log('🔍 Simple Debug Test...');
  
  try {
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'buildingadmin@test.com',
      phoneNumber: '+919876543214',
      role: 'BUILDING_ADMIN'
    });
    
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: loginResponse.data.data.userId,
      otp: '1234'
    });
    
    const token = verifyResponse.data.data.token;
    console.log('✅ Authentication successful');
    
    // Test basic endpoints that work
    console.log('\n✅ Testing working endpoints...');
    
    try {
      const messagesResponse = await axios.get(`${BASE_URL}/api/messages/68b04099951cc19873fc3dd3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Get All Messages: SUCCESS');
      console.log(`   Found ${messagesResponse.data.data.messages.length} messages`);
    } catch (error) {
      console.log('❌ Get All Messages: FAILED');
    }
    
    try {
      const approvalsResponse = await axios.get(`${BASE_URL}/api/resident-approvals/68b04099951cc19873fc3dd3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Get All Approvals: SUCCESS');
      console.log(`   Found ${approvalsResponse.data.data.approvals.length} approvals`);
    } catch (error) {
      console.log('❌ Get All Approvals: FAILED');
    }
    
    // Test the failing endpoints
    console.log('\n❌ Testing failing endpoints...');
    
    try {
      const previousPostsResponse = await axios.get(`${BASE_URL}/api/messages/68b04099951cc19873fc3dd3/previous-posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Previous Posts: SUCCESS');
    } catch (error) {
      console.log('❌ Previous Posts: FAILED');
      console.log(`   Error: ${error.response?.data?.error}`);
    }
    
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/resident-approvals/68b04099951cc19873fc3dd3/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Approval Stats: SUCCESS');
    } catch (error) {
      console.log('❌ Approval Stats: FAILED');
      console.log(`   Error: ${error.response?.data?.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testSimpleDebug();
