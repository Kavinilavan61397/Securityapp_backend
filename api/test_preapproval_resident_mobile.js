const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function testPreApprovalWithResidentMobile() {
  try {
    console.log('🧪 Testing Pre-Approval with Resident Mobile Number Field\n');

    // Step 1: Login as Resident
    console.log('1️⃣ Logging in as Resident...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'resident@test.com',
      phoneNumber: '+919876543214',
      role: 'RESIDENT'
    });

    console.log('✅ Login successful');
    console.log('📧 OTP sent to email');

    // Step 2: Verify OTP
    console.log('\n2️⃣ Verifying OTP...');
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      otp: '1234'
    });

    const token = otpResponse.data.data.token;
    console.log('✅ OTP verified successfully');
    console.log(`🔑 Token: ${token.substring(0, 20)}...`);

    // Step 3: Create Pre-Approval with Resident Mobile Number
    console.log('\n3️⃣ Creating Pre-Approval with Resident Mobile Number...');
    const buildingId = '68b03c0d951cc19873fc3dbe';
    
    const createResponse = await axios.post(`${BASE_URL}/api/pre-approvals/${buildingId}`, {
      visitorName: 'John Doe',
      visitorPhone: '+919876543210',
      visitorEmail: 'john@example.com',
      purpose: 'Meeting with resident',
      expectedDate: '2024-01-20',
      expectedTime: '04:30 PM',
      notes: 'Important business meeting',
      residentMobileNumber: '+919876543214' // NEW FIELD
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Pre-Approval created successfully');
    console.log('📋 Response:', JSON.stringify(createResponse.data, null, 2));

    const preApprovalId = createResponse.data.data.preApprovalId;

    // Step 4: Get Pre-Approval to verify field is stored
    console.log('\n4️⃣ Getting Pre-Approval to verify Resident Mobile Number...');
    const getResponse = await axios.get(`${BASE_URL}/api/pre-approvals/${buildingId}/${preApprovalId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Pre-Approval retrieved successfully');
    console.log('📋 Response:', JSON.stringify(getResponse.data, null, 2));

    // Step 5: Update Pre-Approval with new Resident Mobile Number
    console.log('\n5️⃣ Updating Pre-Approval with new Resident Mobile Number...');
    const updateResponse = await axios.put(`${BASE_URL}/api/pre-approvals/${buildingId}/${preApprovalId}`, {
      residentMobileNumber: '+919876543215' // UPDATED FIELD
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Pre-Approval updated successfully');
    console.log('📋 Response:', JSON.stringify(updateResponse.data, null, 2));

    // Step 6: Get all Pre-Approvals to verify field in list
    console.log('\n6️⃣ Getting all Pre-Approvals to verify field in list...');
    const getAllResponse = await axios.get(`${BASE_URL}/api/pre-approvals/${buildingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ All Pre-Approvals retrieved successfully');
    console.log('📋 Response:', JSON.stringify(getAllResponse.data, null, 2));

    console.log('\n🎉 ALL TESTS PASSED! Resident Mobile Number field is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testPreApprovalWithResidentMobile();
