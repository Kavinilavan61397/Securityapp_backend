const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

async function testVisitorProcedure() {
  try {
    console.log('🧪 Testing Visitor Creation and Retrieval Procedure...');
    console.log('📍 Server:', BASE_URL);
    console.log('');

    // Step 1: Login to get JWT token (using a user with proper permissions)
    console.log('1️⃣ Logging in to get JWT token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'testresident@example.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    console.log('✅ Login successful');
    console.log('   User ID:', loginResponse.data.data?.userId);
    console.log('   Email:', loginResponse.data.data?.email);
    console.log('   Role:', loginResponse.data.data?.role);
    console.log('');

    // Step 2: Verify OTP with static code
    console.log('2️⃣ Verifying OTP with "1234"...');
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: loginResponse.data.data.userId,
      otp: '1234'
    });
    
    console.log('🔍 OTP Verification Response:', JSON.stringify(verifyResponse.data, null, 2));
    
    if (!verifyResponse.data.success) {
      console.log('❌ OTP verification failed:', verifyResponse.data.message);
      return;
    }
    
    const token = verifyResponse.data.data.token;
    const userId = verifyResponse.data.data.user.id;
    const buildingId = verifyResponse.data.data.user.buildingId;
    
    console.log('✅ OTP verification successful');
    console.log('   Token:', token ? 'Generated ✅' : 'Not generated ❌');
    console.log('   User ID:', userId);
    console.log('   Building ID:', buildingId);
    console.log('   Role:', verifyResponse.data.data.user.role);
    console.log('');
    
    // Note: RESIDENT role can now create and manage visitors
    console.log('✅ RESIDENT role can now create and manage visitors');
    console.log('');

    // Step 3: Create Visitor
    console.log('3️⃣ Creating Visitor...');
    const visitorData = {
      "name": "John Doe",
      "phoneNumber": "+919876543210",
      "email": "john.doe@example.com",
      "idType": "AADHAR",
      "idNumber": "123456789012",
      "purpose": "Meeting with resident",
      "company": "Tech Corp",
      "vehicleNumber": "MH12AB1234",
      "emergencyContact": {
        "name": "Jane Doe",
        "phone": "+919876543211",
        "relationship": "Spouse"
      },
      "hostId": userId
    };
    
    console.log('📝 Visitor Data:');
    console.log(JSON.stringify(visitorData, null, 2));
    console.log('');
    
    try {
      const createResponse = await axios.post(`${BASE_URL}/api/visitors/${buildingId}`, visitorData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (createResponse.data.success) {
        console.log('✅ Visitor created successfully!');
        console.log('   Visitor ID:', createResponse.data.data?.visitorId);
        console.log('   Name:', createResponse.data.data?.name);
        console.log('   Status:', createResponse.data.data?.status);
        console.log('   Created At:', createResponse.data.data?.createdAt);
      } else {
        console.log('❌ Visitor creation failed:', createResponse.data.message);
        if (createResponse.data.errors) {
          console.log('   Errors:', createResponse.data.errors);
        }
      }
    } catch (error) {
      console.log('❌ Visitor creation failed:', error.response?.data?.message || error.message);
      if (error.response?.data?.errors) {
        console.log('   Errors:', error.response.data.errors);
      }
    }
    console.log('');

    // Step 4: Get All Visitors
    console.log('4️⃣ Getting All Visitors...');
    try {
      const getVisitorsResponse = await axios.get(`${BASE_URL}/api/visitors/${buildingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (getVisitorsResponse.data.success) {
        console.log('✅ Visitors retrieved successfully!');
        console.log('   Total Visitors:', getVisitorsResponse.data.data?.pagination?.totalVisitors || 0);
        console.log('   Current Page:', getVisitorsResponse.data.data?.pagination?.currentPage || 1);
        console.log('   Total Pages:', getVisitorsResponse.data.data?.pagination?.totalPages || 1);
        
        if (getVisitorsResponse.data.data?.visitors && getVisitorsResponse.data.data.visitors.length > 0) {
          console.log('   Visitors List:');
          getVisitorsResponse.data.data.visitors.forEach((visitor, index) => {
            console.log(`     ${index + 1}. ${visitor.name} (${visitor.email}) - ${visitor.status}`);
            console.log(`        ID: ${visitor._id}`);
            console.log(`        Phone: ${visitor.phoneNumber}`);
            console.log(`        Purpose: ${visitor.purpose}`);
            console.log(`        Created: ${visitor.createdAt}`);
            console.log('');
          });
        } else {
          console.log('   No visitors found');
        }
      } else {
        console.log('❌ Failed to get visitors:', getVisitorsResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Failed to get visitors:', error.response?.data?.message || error.message);
      if (error.response?.data?.errors) {
        console.log('   Errors:', error.response.data.errors);
      }
    }

    console.log('\n🎉 Visitor Procedure Test Complete!');

  } catch (error) {
    console.log('❌ Error during testing:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.log('   Detailed errors:', error.response.data.errors);
    }
  }
}

testVisitorProcedure();
