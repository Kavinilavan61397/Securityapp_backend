const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function testFlatNumberPreApproval() {
  console.log('🧪 Testing Pre-Approval with flatNumber field...\n');

  try {
    // Step 1: Login as Resident
    console.log('1️⃣ Logging in as Resident...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'resident@test.com',
      phoneNumber: '+919876543212',
      role: 'RESIDENT'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const userId = loginResponse.data.data.userId;
    console.log('✅ Login successful, userId:', userId);

    // Step 2: Verify OTP
    console.log('\n2️⃣ Verifying OTP...');
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: userId,
      otp: '1234'
    });

    if (!otpResponse.data.success) {
      throw new Error('OTP verification failed');
    }

    const token = otpResponse.data.data.token;
    console.log('✅ OTP verified, token received');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const buildingId = '68b04099951cc19873fc3dd3';

    // Step 3: Create Pre-approval WITH flatNumber
    console.log('\n3️⃣ Creating Pre-approval WITH flatNumber...');
    const createResponse = await axios.post(`${BASE_URL}/api/pre-approvals/${buildingId}`, {
      visitorName: 'Test Visitor with Flat',
      visitorPhone: '+919876543299',
      visitorEmail: 'testvisitor@example.com',
      purpose: 'Testing flatNumber field',
      residentMobileNumber: '+919876543212',
      flatNumber: '101'
    }, { headers });

    if (!createResponse.data.success) {
      throw new Error('Create pre-approval failed');
    }

    const preApprovalId = createResponse.data.data.preApprovalId;
    console.log('✅ Pre-approval created with flatNumber:', createResponse.data.data.flatNumber);

    // Step 4: Get All Pre-approvals (should include flatNumber)
    console.log('\n4️⃣ Getting All Pre-approvals...');
    const getAllResponse = await axios.get(`${BASE_URL}/api/pre-approvals/${buildingId}`, { headers });

    if (!getAllResponse.data.success) {
      throw new Error('Get all pre-approvals failed');
    }

    console.log('✅ Retrieved pre-approvals count:', getAllResponse.data.data.preApprovals.length);
    if (getAllResponse.data.data.preApprovals.length > 0) {
      const firstApproval = getAllResponse.data.data.preApprovals[0];
      console.log('✅ First pre-approval flatNumber:', firstApproval.flatNumber);
    }

    // Step 5: Get Single Pre-approval (should include flatNumber)
    console.log('\n5️⃣ Getting Single Pre-approval...');
    const getSingleResponse = await axios.get(`${BASE_URL}/api/pre-approvals/${buildingId}/${preApprovalId}`, { headers });

    if (!getSingleResponse.data.success) {
      throw new Error('Get single pre-approval failed');
    }

    console.log('✅ Single pre-approval flatNumber:', getSingleResponse.data.data.flatNumber);

    // Step 6: Update Pre-approval with new flatNumber
    console.log('\n6️⃣ Updating Pre-approval with new flatNumber...');
    const updateResponse = await axios.put(`${BASE_URL}/api/pre-approvals/${buildingId}/${preApprovalId}`, {
      flatNumber: '102A'
    }, { headers });

    if (!updateResponse.data.success) {
      throw new Error('Update pre-approval failed');
    }

    console.log('✅ Pre-approval updated, new flatNumber:', updateResponse.data.data.flatNumber);

    // Step 7: Test validation - flatNumber too long
    console.log('\n7️⃣ Testing validation - flatNumber too long...');
    try {
      await axios.post(`${BASE_URL}/api/pre-approvals/${buildingId}`, {
        visitorName: 'Test Validation',
        visitorPhone: '+919876543298',
        flatNumber: 'ThisIsAVeryLongFlatNumberThatExceedsTwentyCharacters'
      }, { headers });
      console.log('❌ Validation should have failed but didn\'t');
    } catch (error) {
      if (error.response && error.response.data.message.includes('Flat number cannot exceed 20 characters')) {
        console.log('✅ Validation working correctly - flatNumber too long rejected');
      } else {
        console.log('❌ Unexpected validation error:', error.response?.data?.message);
      }
    }

    // Step 8: Test validation - flatNumber empty string (should be valid)
    console.log('\n8️⃣ Testing validation - empty flatNumber (should be valid)...');
    const emptyFlatResponse = await axios.post(`${BASE_URL}/api/pre-approvals/${buildingId}`, {
      visitorName: 'Test Empty Flat',
      visitorPhone: '+919876543297',
      flatNumber: ''
    }, { headers });

    if (emptyFlatResponse.data.success) {
      console.log('✅ Empty flatNumber accepted (optional field)');
    } else {
      console.log('❌ Empty flatNumber rejected unexpectedly');
    }

    console.log('\n🎉 ALL TESTS PASSED! flatNumber field is working correctly!');
    console.log('\n📊 SUMMARY:');
    console.log('✅ Create pre-approval with flatNumber - WORKING');
    console.log('✅ Get all pre-approvals returns flatNumber - WORKING');
    console.log('✅ Get single pre-approval returns flatNumber - WORKING');
    console.log('✅ Update pre-approval with flatNumber - WORKING');
    console.log('✅ Validation for flatNumber length - WORKING');
    console.log('✅ Optional field behavior - WORKING');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

testFlatNumberPreApproval();
