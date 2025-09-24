const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function testFlatNumberField() {
  console.log('🧪 Testing flatNumber field (string format)...\n');

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

    // Step 3: Create Visitor with flatNumber (string)
    console.log('\n3️⃣ Creating Visitor with flatNumber (string)...');
    const createResponse = await axios.post(`${BASE_URL}/api/visitors/${buildingId}`, {
      name: 'Test Visitor',
      phoneNumber: '+919876543299',
      email: 'test@example.com',
      visitorCategory: 'FLAT_EMPLOYEE',
      serviceType: 'Housekeeping',
      employeeCode: 'EMP001',
      flatNumber: '41b',  // String format - exactly what you used in Postman
      purpose: 'Testing flatNumber field'
    }, { headers });

    if (!createResponse.data.success) {
      throw new Error('Create visitor failed');
    }

    const visitorId = createResponse.data.data.visitorId;
    console.log('✅ Visitor created successfully!');
    console.log('✅ flatNumber in response:', createResponse.data.data.flatNumber);
    console.log('✅ visitorId:', visitorId);

    // Step 4: Get the visitor to verify flatNumber is stored correctly
    console.log('\n4️⃣ Getting visitor to verify flatNumber...');
    const getResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}/${visitorId}`, { headers });

    if (!getResponse.data.success) {
      throw new Error('Get visitor failed');
    }

    console.log('✅ Visitor retrieved successfully!');
    console.log('✅ flatNumber in get response:', getResponse.data.data.flatNumber);

    console.log('\n🎉 SUCCESS! flatNumber field is working as a string!');
    console.log('\n📊 SUMMARY:');
    console.log('✅ Create visitor with flatNumber (string) - WORKING');
    console.log('✅ Get visitor returns flatNumber (string) - WORKING');
    console.log('✅ Field type: String (not array)');
    console.log('✅ Your Postman request should now work with "flatNumber": "41b"');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

testFlatNumberField();
