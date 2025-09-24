const axios = require('axios');

// Configuration
const BASE_URL = 'https://securityapp-backend.vercel.app/api';
const BUILDING_ID = '68b04099951cc19873fc3dd3';
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

// Test data
const testData = {
  visitorName: 'API Test Visitor',
  visitorPhone: '9876543210',
  visitorEmail: 'test@email.com',
  purpose: 'API Testing',
  expectedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  expectedTime: '2:00 PM',
  notes: 'Testing pre-approval API',
  residentMobileNumber: '9876543210',
  flatNumber: 'A-999'
};

async function testCreatePreApproval() {
  console.log('🚀 Testing CREATE Pre-approval...');
  
  try {
    const response = await axios.post(`${BASE_URL}/pre-approvals/${BUILDING_ID}`, testData, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success:', response.data.message);
    console.log('Pre-approval ID:', response.data.data.preApprovalId);
    return response.data.data.preApprovalId;
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testGetAllPreApprovals() {
  console.log('\n📋 Testing GET All Pre-approvals...');
  
  try {
    const response = await axios.get(`${BASE_URL}/pre-approvals/${BUILDING_ID}?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    console.log('✅ Success:', response.data.message);
    console.log('Total pre-approvals:', response.data.data.pagination.totalPreApprovals);
    return response.data.data.preApprovals[0]?.id;
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testApprovePreApproval(preApprovalId) {
  if (!preApprovalId) {
    console.log('⚠️ No pre-approval ID for approval test');
    return;
  }
  
  console.log('\n✅ Testing APPROVE Pre-approval...');
  
  try {
    const response = await axios.post(`${BASE_URL}/pre-approvals/${BUILDING_ID}/${preApprovalId}/approve`, {
      adminNotes: 'Approved by API test'
    }, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success:', response.data.message);
    console.log('Status:', response.data.data.status);
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 PRE-APPROVAL API QUICK TEST');
  console.log('==============================');
  
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('❌ Please update AUTH_TOKEN with a valid JWT token');
    return;
  }
  
  const createdId = await testCreatePreApproval();
  const existingId = await testGetAllPreApprovals();
  const testId = createdId || existingId;
  
  await testApprovePreApproval(testId);
  
  console.log('\n🎉 Tests completed!');
}

runTests();
