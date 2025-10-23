require("dotenv").config();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `https://securityapp-backend.vercel.app`;
const API_BASE = `${BASE_URL}/api`;

// Manual test script for blocked users functionality
async function manualTestBlockedUsers() {
  console.log('🧪 Manual Test: Blocked Users System');
  console.log('=====================================');
  console.log('');
  console.log('📋 INSTRUCTIONS:');
  console.log('1. First, get a valid token by running: node get_super_admin_token.js');
  console.log('2. Copy the token from the output');
  console.log('3. Replace YOUR_TOKEN_HERE below with your actual token');
  console.log('4. Replace USER_ID_TO_BLOCK with an actual user ID from your system');
  console.log('5. Run this script: node manual_test_blocked_users.js');
  console.log('');
  
  // Replace these with your actual values
  const YOUR_TOKEN = 'YOUR_TOKEN_HERE';
  const USER_ID_TO_BLOCK = 'USER_ID_TO_BLOCK';
  
  if (YOUR_TOKEN === 'YOUR_TOKEN_HERE' || USER_ID_TO_BLOCK === 'USER_ID_TO_BLOCK') {
    console.log('❌ Please update the token and user ID in this script first!');
    console.log('');
    console.log('🔧 To get a token, run:');
    console.log('   node get_super_admin_token.js');
    console.log('');
    console.log('🔧 To get user IDs, run:');
    console.log('   curl -X GET https://securityapp-backend.vercel.app/api/auth/users \\');
    console.log('     -H "Authorization: Bearer YOUR_TOKEN"');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${YOUR_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  try {
    console.log('🚀 Starting manual test...');
    console.log('');
    
    // Test 1: Get blocked users list (should be empty initially)
    console.log('📋 Test 1: Getting blocked users list...');
    try {
      const response = await axios.get(`${API_BASE}/blocked-users`, { headers });
      console.log('✅ Success!');
      console.log(`Total blocked users: ${response.data.data.totalBlocked}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.log('❌ Failed:', error.response?.data?.message || error.message);
    }
    
    console.log('');
    
    // Test 2: Block a user
    console.log('🚫 Test 2: Blocking user...');
    try {
      const response = await axios.post(`${API_BASE}/blocked-users/${USER_ID_TO_BLOCK}`, {}, { headers });
      console.log('✅ Success!');
      console.log(`Message: ${response.data.message}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.log('❌ Failed:', error.response?.data?.message || error.message);
    }
    
    console.log('');
    
    // Test 3: Check if user is blocked
    console.log('🔍 Test 3: Checking if user is blocked...');
    try {
      const response = await axios.get(`${API_BASE}/blocked-users/${USER_ID_TO_BLOCK}/status`, { headers });
      console.log('✅ Success!');
      console.log(`Is blocked: ${response.data.data.isBlocked}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.log('❌ Failed:', error.response?.data?.message || error.message);
    }
    
    console.log('');
    
    // Test 4: Get posts with filtering
    console.log('📝 Test 4: Getting posts with filtering...');
    try {
      const response = await axios.get(`${API_BASE}/posts`, { headers });
      console.log('✅ Success!');
      console.log(`Total posts: ${response.data.pagination?.totalPosts || 0}`);
      console.log(`Blocked users count: ${response.data.filters?.blockedUsersCount || 0}`);
      console.log(`Blocked user IDs: ${response.data.filters?.blockedUserIds || []}`);
    } catch (error) {
      console.log('❌ Failed:', error.response?.data?.message || error.message);
    }
    
    console.log('');
    
    // Test 5: Get blocked users list again
    console.log('📋 Test 5: Getting blocked users list again...');
    try {
      const response = await axios.get(`${API_BASE}/blocked-users`, { headers });
      console.log('✅ Success!');
      console.log(`Total blocked users: ${response.data.data.totalBlocked}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.log('❌ Failed:', error.response?.data?.message || error.message);
    }
    
    console.log('');
    
    // Test 6: Unblock user
    console.log('✅ Test 6: Unblocking user...');
    try {
      const response = await axios.delete(`${API_BASE}/blocked-users/${USER_ID_TO_BLOCK}`, { headers });
      console.log('✅ Success!');
      console.log(`Message: ${response.data.message}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.log('❌ Failed:', error.response?.data?.message || error.message);
    }
    
    console.log('');
    console.log('🎉 Manual test completed!');
    console.log('========================');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the manual test
manualTestBlockedUsers();
