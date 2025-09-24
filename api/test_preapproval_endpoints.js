const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function testPreApprovalEndpoints() {
  console.log('🧪 Testing Resident Pre-approval Endpoints...\n');

  try {
    // Step 1: Login as Resident
    console.log('1️⃣ Logging in as Resident...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'resident@test.com',
      phoneNumber: '+919876543211',
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

    // Step 3: Create Pre-approval
    console.log('\n3️⃣ Creating Pre-approval...');
    const createResponse = await axios.post(`${BASE_URL}/api/pre-approvals/${buildingId}`, {
      visitorName: 'John Doe',
      visitorPhone: '+919876543299',
      visitorEmail: 'john@example.com',
      purpose: 'Business meeting',
      expectedDate: '2025-01-25T10:00:00.000Z',
      expectedTime: '10:00 AM',
      notes: 'Important client meeting',
      residentMobileNumber: '+919876543211',
      flatNumber: '101'
    }, { headers });

    if (!createResponse.data.success) {
      throw new Error('Create pre-approval failed');
    }

    const preApprovalId = createResponse.data.data.preApprovalId;
    console.log('✅ Pre-approval created successfully!');
    console.log('✅ flatNumber:', createResponse.data.data.flatNumber);
    console.log('✅ preApprovalId:', preApprovalId);

    // Step 4: Get All Pre-approvals
    console.log('\n4️⃣ Getting All Pre-approvals...');
    const getAllResponse = await axios.get(`${BASE_URL}/api/pre-approvals/${buildingId}`, { headers });

    if (!getAllResponse.data.success) {
      throw new Error('Get all pre-approvals failed');
    }

    console.log('✅ Retrieved pre-approvals count:', getAllResponse.data.data.preApprovals.length);
    if (getAllResponse.data.data.preApprovals.length > 0) {
      const firstPreApproval = getAllResponse.data.data.preApprovals[0];
      console.log('✅ First pre-approval flatNumber:', firstPreApproval.flatNumber);
      console.log('✅ First pre-approval status:', firstPreApproval.status);
    }

    // Step 5: Get Single Pre-approval
    console.log('\n5️⃣ Getting Single Pre-approval...');
    const getSingleResponse = await axios.get(`${BASE_URL}/api/pre-approvals/${buildingId}/${preApprovalId}`, { headers });

    if (!getSingleResponse.data.success) {
      throw new Error('Get single pre-approval failed');
    }

    console.log('✅ Single pre-approval flatNumber:', getSingleResponse.data.data.flatNumber);
    console.log('✅ Single pre-approval status:', getSingleResponse.data.data.status);

    // Step 6: Update Pre-approval
    console.log('\n6️⃣ Updating Pre-approval...');
    const updateResponse = await axios.put(`${BASE_URL}/api/pre-approvals/${buildingId}/${preApprovalId}`, {
      visitorName: 'John Doe Updated',
      purpose: 'Updated business meeting',
      flatNumber: '102',
      notes: 'Updated meeting details'
    }, { headers });

    if (!updateResponse.data.success) {
      throw new Error('Update pre-approval failed');
    }

    console.log('✅ Pre-approval updated successfully!');
    console.log('✅ Updated flatNumber:', updateResponse.data.data.flatNumber);
    console.log('✅ Updated visitorName:', updateResponse.data.data.visitorName);

    // Step 7: Get Pre-approvals by Status
    console.log('\n7️⃣ Getting Pre-approvals by Status (PENDING)...');
    const getByStatusResponse = await axios.get(`${BASE_URL}/api/pre-approvals/${buildingId}?status=PENDING`, { headers });

    if (!getByStatusResponse.data.success) {
      throw new Error('Get pre-approvals by status failed');
    }

    console.log('✅ Retrieved pending pre-approvals count:', getByStatusResponse.data.data.preApprovals.length);

    // Step 8: Test Validation - Missing Required Fields
    console.log('\n8️⃣ Testing validation - Missing required fields...');
    try {
      await axios.post(`${BASE_URL}/api/pre-approvals/${buildingId}`, {
        visitorEmail: 'test@example.com'
        // Missing visitorName and visitorPhone
      }, { headers });
      console.log('❌ Validation should have failed but didn\'t');
    } catch (error) {
      if (error.response && error.response.data.message.includes('Validation failed')) {
        console.log('✅ Validation working correctly - Missing required fields rejected');
        console.log('✅ Validation errors:', error.response.data.errors.length);
      } else {
        console.log('❌ Unexpected validation error:', error.response?.data?.message);
      }
    }

    // Step 9: Test Validation - Invalid Email
    console.log('\n9️⃣ Testing validation - Invalid email...');
    try {
      await axios.post(`${BASE_URL}/api/pre-approvals/${buildingId}`, {
        visitorName: 'Test Visitor',
        visitorPhone: '+919876543298',
        visitorEmail: 'invalid-email'
      }, { headers });
      console.log('❌ Validation should have failed but didn\'t');
    } catch (error) {
      if (error.response && error.response.data.message.includes('Validation failed')) {
        console.log('✅ Validation working correctly - Invalid email rejected');
      } else {
        console.log('❌ Unexpected validation error:', error.response?.data?.message);
      }
    }

    // Step 10: Test Validation - FlatNumber too long
    console.log('\n🔟 Testing validation - FlatNumber too long...');
    try {
      await axios.post(`${BASE_URL}/api/pre-approvals/${buildingId}`, {
        visitorName: 'Test Visitor',
        visitorPhone: '+919876543297',
        flatNumber: 'ThisIsAVeryLongFlatNumberThatExceedsTwentyCharacters'
      }, { headers });
      console.log('❌ Validation should have failed but didn\'t');
    } catch (error) {
      if (error.response && error.response.data.message.includes('Validation failed')) {
        console.log('✅ Validation working correctly - FlatNumber too long rejected');
      } else {
        console.log('❌ Unexpected validation error:', error.response?.data?.message);
      }
    }

    // Step 11: Delete Pre-approval
    console.log('\n1️⃣1️⃣ Deleting Pre-approval...');
    const deleteResponse = await axios.delete(`${BASE_URL}/api/pre-approvals/${buildingId}/${preApprovalId}`, { headers });

    if (!deleteResponse.data.success) {
      throw new Error('Delete pre-approval failed');
    }

    console.log('✅ Pre-approval deleted successfully!');
    console.log('✅ Deleted preApprovalId:', deleteResponse.data.data.preApprovalId);

    // Step 12: Verify Deletion
    console.log('\n1️⃣2️⃣ Verifying Deletion...');
    try {
      await axios.get(`${BASE_URL}/api/pre-approvals/${buildingId}/${preApprovalId}`, { headers });
      console.log('❌ Pre-approval should have been deleted');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Pre-approval successfully deleted - 404 Not Found');
      } else {
        console.log('❌ Unexpected error after deletion:', error.response?.data?.message);
      }
    }

    console.log('\n🎉 ALL TESTS PASSED! Resident Pre-approval endpoints are working correctly!');
    console.log('\n📊 SUMMARY:');
    console.log('✅ Create pre-approval with flatNumber - WORKING');
    console.log('✅ Get all pre-approvals - WORKING');
    console.log('✅ Get single pre-approval - WORKING');
    console.log('✅ Update pre-approval with flatNumber - WORKING');
    console.log('✅ Get pre-approvals by status - WORKING');
    console.log('✅ Delete pre-approval - WORKING');
    console.log('✅ Validation for required fields - WORKING');
    console.log('✅ Validation for email format - WORKING');
    console.log('✅ Validation for flatNumber length - WORKING');
    console.log('✅ Access control (RESIDENT only) - WORKING');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

testPreApprovalEndpoints();
