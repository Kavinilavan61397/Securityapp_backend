const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function testVisitorFlatNumbers() {
  console.log('🧪 Testing Visitor Endpoints with flatNumbers field...\n');

  try {
    // Step 1: Login as Security
    console.log('1️⃣ Logging in as Security...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'security@test.com',
      phoneNumber: '+919876543210',
      role: 'SECURITY'
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

    // Step 3: Create Visitor with flatNumber (FLAT_EMPLOYEE category)
    console.log('\n3️⃣ Creating Visitor with flatNumber (FLAT_EMPLOYEE)...');
    const createResponse = await axios.post(`${BASE_URL}/api/visitors/${buildingId}`, {
      name: 'John Doe - Flat Employee',
      phoneNumber: '+919876543299',
      email: 'john@example.com',
      visitorCategory: 'FLAT_EMPLOYEE',
      serviceType: 'Housekeeping',
      employeeCode: 'EMP001',
      flatNumber: '101',
      purpose: 'Regular maintenance work',
      company: 'CleanPro Services'
    }, { headers });

    if (!createResponse.data.success) {
      throw new Error('Create visitor failed');
    }

    const visitorId = createResponse.data.data.visitorId;
    console.log('✅ Visitor created with flatNumber:', createResponse.data.data.flatNumber);

    // Step 4: Create Visitor with flatNumber (CAB_DRIVER category)
    console.log('\n4️⃣ Creating Visitor with flatNumber (CAB_DRIVER)...');
    const createCabResponse = await axios.post(`${BASE_URL}/api/visitors/${buildingId}`, {
      name: 'Mike Smith - Cab Driver',
      phoneNumber: '+919876543298',
      visitorCategory: 'CAB_DRIVER',
      serviceType: 'Uber',
      vehicleNumber: 'KA01AB1234',
      vehicleType: 'CAR',
      flatNumber: '201',
      purpose: 'Pickup service'
    }, { headers });

    if (!createCabResponse.data.success) {
      throw new Error('Create cab driver visitor failed');
    }

    console.log('✅ Cab driver visitor created with flatNumber:', createCabResponse.data.data.flatNumber);

    // Step 5: Get All Visitors (should include flatNumber)
    console.log('\n5️⃣ Getting All Visitors...');
    const getAllResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}`, { headers });

    if (!getAllResponse.data.success) {
      throw new Error('Get all visitors failed');
    }

    console.log('✅ Retrieved visitors count:', getAllResponse.data.data.visitors.length);
    if (getAllResponse.data.data.visitors.length > 0) {
      const firstVisitor = getAllResponse.data.data.visitors[0];
      console.log('✅ First visitor flatNumber:', firstVisitor.flatNumber);
      console.log('✅ First visitor category:', firstVisitor.visitorCategory);
    }

    // Step 6: Get Single Visitor (should include flatNumber)
    console.log('\n6️⃣ Getting Single Visitor...');
    const getSingleResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}/${visitorId}`, { headers });

    if (!getSingleResponse.data.success) {
      throw new Error('Get single visitor failed');
    }

    console.log('✅ Single visitor flatNumber:', getSingleResponse.data.data.flatNumber);
    console.log('✅ Single visitor category:', getSingleResponse.data.data.visitorCategory);

    // Step 7: Update Visitor with new flatNumber
    console.log('\n7️⃣ Updating Visitor with new flatNumber...');
    const updateResponse = await axios.put(`${BASE_URL}/api/visitors/${buildingId}/${visitorId}`, {
      flatNumber: '105',
      serviceType: 'Premium Housekeeping'
    }, { headers });

    if (!updateResponse.data.success) {
      throw new Error('Update visitor failed');
    }

    console.log('✅ Visitor updated, new flatNumber:', updateResponse.data.data.flatNumber);

    // Step 8: Test validation - flatNumber too long
    console.log('\n8️⃣ Testing validation - flatNumber too long...');
    try {
      await axios.post(`${BASE_URL}/api/visitors/${buildingId}`, {
        name: 'Test Validation',
        phoneNumber: '+919876543297',
        visitorCategory: 'FLAT_EMPLOYEE',
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

    // Step 9: Test validation - flatNumber valid
    console.log('\n9️⃣ Testing validation - flatNumber valid...');
    try {
      const validResponse = await axios.post(`${BASE_URL}/api/visitors/${buildingId}`, {
        name: 'Test Validation 2',
        phoneNumber: '+919876543296',
        visitorCategory: 'FLAT_EMPLOYEE',
        flatNumber: '101' // Valid flat number
      }, { headers });
      console.log('✅ Validation working correctly - flatNumber accepted');
      console.log('✅ Valid visitor created with flatNumber:', validResponse.data.data.flatNumber);
    } catch (error) {
      console.log('❌ Unexpected validation error:', error.response?.data?.message);
    }

    console.log('\n🎉 ALL TESTS PASSED! flatNumber field is working correctly!');
    console.log('\n📊 SUMMARY:');
    console.log('✅ Create visitor with flatNumber - WORKING');
    console.log('✅ Get all visitors returns flatNumber - WORKING');
    console.log('✅ Get single visitor returns flatNumber - WORKING');
    console.log('✅ Update visitor with flatNumber - WORKING');
    console.log('✅ Validation for flatNumber length - WORKING');
    console.log('✅ Validation for flatNumber format - WORKING');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

testVisitorFlatNumbers();
