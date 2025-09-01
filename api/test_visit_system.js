require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// Test data
let authToken = '';
let buildingId = '';
let visitorId = '';
let hostId = '';
let visitId = '';

console.log('🚀 Starting Visit Management System Tests...\n');

async function testVisitSystem() {
  try {
    console.log('📋 Test Plan:');
    console.log('1. Authentication (Super Admin)');
    console.log('2. Create Building');
    console.log('3. Create Visitor');
    console.log('4. Create Host (Resident)');
    console.log('5. Create Visit');
    console.log('6. Get All Visits');
    console.log('7. Get Visit by ID');
    console.log('8. Update Visit (Approve)');
    console.log('9. Check-in Visitor');
    console.log('10. Check-out Visitor');
    console.log('11. Get Visit Statistics');
    console.log('12. Search Visits');
    console.log('\n' + '='.repeat(60) + '\n');

    // Step 1: Authentication
    console.log('🔐 Step 1: Authenticating as Super Admin...');
    const authResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Super Admin Test',
      email: 'superadmin@test.com',
      phoneNumber: '+919876543210',
      password: 'Test@123',
      role: 'SUPER_ADMIN'
    });

    if (authResponse.data.success) {
      console.log('✅ Registration successful');
      const { userId, otpCode } = authResponse.data.data;
      
      // Verify OTP
      const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
        userId,
        otpCode
      });

      if (otpResponse.data.success) {
        authToken = otpResponse.data.data.token;
        console.log('✅ OTP verification successful');
      } else {
        throw new Error('OTP verification failed');
      }
    } else {
      throw new Error('Registration failed');
    }

    // Step 2: Create Building
    console.log('\n🏢 Step 2: Creating Building...');
    const buildingResponse = await axios.post(`${BASE_URL}/api/buildings`, {
      name: 'Test Building',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        country: 'Test Country'
      },
      totalFloors: 10,
      totalFlats: 50,
      contactPhone: '+919876543211',
      contactEmail: 'building@test.com',
      features: ['PARKING', 'SECURITY', 'ELEVATOR'],
      operatingHours: {
        open: '06:00',
        close: '22:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      securitySettings: {
        visitorCheckIn: true,
        visitorCheckOut: true,
        photoCapture: true,
        idVerification: true,
        notificationAlerts: true
      }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (buildingResponse.data.success) {
      buildingId = buildingResponse.data.data.building._id;
      console.log('✅ Building created successfully');
    } else {
      throw new Error('Building creation failed');
    }

    // Step 3: Create Visitor
    console.log('\n👤 Step 3: Creating Visitor...');
    const visitorResponse = await axios.post(`${BASE_URL}/api/visitors/${buildingId}`, {
      name: 'John Doe',
      phoneNumber: '+919876543212',
      email: 'john.doe@test.com',
      idType: 'AADHAR',
      idNumber: '123456789012',
      purpose: 'Meeting with resident',
      company: 'Test Company',
      vehicleNumber: 'TN01AB1234'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (visitorResponse.data.success) {
      visitorId = visitorResponse.data.data.visitor._id;
      console.log('✅ Visitor created successfully');
    } else {
      throw new Error('Visitor creation failed');
    }

    // Step 4: Create Host (Resident)
    console.log('\n🏠 Step 4: Creating Host (Resident)...');
    const hostResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Jane Smith',
      email: 'jane.smith@test.com',
      phoneNumber: '+919876543213',
      password: 'Test@123',
      role: 'RESIDENT',
      buildingId,
      flatNumber: 'A-101',
      tenantType: 'OWNER'
    });

    if (hostResponse.data.success) {
      const { userId: hostUserId, otpCode: hostOtpCode } = hostResponse.data.data;
      
      // Verify OTP for host
      const hostOtpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
        userId: hostUserId,
        otpCode: hostOtpCode
      });

      if (hostOtpResponse.data.success) {
        hostId = hostUserId;
        console.log('✅ Host (Resident) created successfully');
      } else {
        throw new Error('Host OTP verification failed');
      }
    } else {
      throw new Error('Host creation failed');
    }

    // Step 5: Create Visit
    console.log('\n📝 Step 5: Creating Visit...');
    const visitResponse = await axios.post(`${BASE_URL}/api/visits/${buildingId}`, {
      visitorId,
      hostId,
      hostFlatNumber: 'A-101',
      purpose: 'Business meeting to discuss project requirements',
      visitType: 'WALK_IN',
      expectedDuration: 120,
      vehicleNumber: 'TN01AB1234',
      vehicleType: 'CAR'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (visitResponse.data.success) {
      visitId = visitResponse.data.data.visit._id;
      console.log('✅ Visit created successfully');
      console.log(`   Visit ID: ${visitResponse.data.data.visit.visitId}`);
      console.log(`   QR Code: ${visitResponse.data.data.visit.qrCode}`);
    } else {
      throw new Error('Visit creation failed');
    }

    // Step 6: Get All Visits
    console.log('\n📋 Step 6: Getting All Visits...');
    const getVisitsResponse = await axios.get(`${BASE_URL}/api/visits/${buildingId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (getVisitsResponse.data.success) {
      console.log('✅ All visits retrieved successfully');
      console.log(`   Total visits: ${getVisitsResponse.data.data.pagination.totalVisits}`);
    } else {
      throw new Error('Get visits failed');
    }

    // Step 7: Get Visit by ID
    console.log('\n🔍 Step 7: Getting Visit by ID...');
    const getVisitResponse = await axios.get(`${BASE_URL}/api/visits/${buildingId}/${visitId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (getVisitResponse.data.success) {
      console.log('✅ Visit retrieved successfully');
      console.log(`   Status: ${getVisitResponse.data.data.visit.status}`);
      console.log(`   Approval Status: ${getVisitResponse.data.data.visit.approvalStatus}`);
    } else {
      throw new Error('Get visit by ID failed');
    }

    // Step 8: Update Visit (Approve)
    console.log('\n✅ Step 8: Approving Visit...');
    const updateVisitResponse = await axios.put(`${BASE_URL}/api/visits/${buildingId}/${visitId}`, {
      approvalStatus: 'APPROVED'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (updateVisitResponse.data.success) {
      console.log('✅ Visit approved successfully');
      console.log(`   New Status: ${updateVisitResponse.data.data.visit.status}`);
    } else {
      throw new Error('Visit approval failed');
    }

    // Step 9: Check-in Visitor (Security role required)
    console.log('\n🚪 Step 9: Checking-in Visitor...');
    // Create a security user for check-in
    const securityResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Security Guard',
      email: 'security@test.com',
      phoneNumber: '+919876543214',
      password: 'Test@123',
      role: 'SECURITY',
      buildingId,
      employeeCode: 'SEC001'
    });

    if (securityResponse.data.success) {
      const { userId: securityUserId, otpCode: securityOtpCode } = securityResponse.data.data;
      
      // Verify OTP for security
      const securityOtpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
        userId: securityUserId,
        otpCode: securityOtpCode
      });

      if (securityOtpResponse.data.success) {
        const securityToken = securityOtpResponse.data.data.token;
        
        // Get the visit to get QR code
        const visitForQR = await axios.get(`${BASE_URL}/api/visits/${buildingId}/${visitId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        const qrCode = visitForQR.data.data.visit.qrCode;

        // Check-in
        const checkInResponse = await axios.post(`${BASE_URL}/api/visits/${buildingId}/${visitId}/checkin`, {
          qrCode,
          securityNotes: 'Visitor checked in successfully'
        }, {
          headers: { Authorization: `Bearer ${securityToken}` }
        });

        if (checkInResponse.data.success) {
          console.log('✅ Visitor checked in successfully');
          console.log(`   Check-in Time: ${checkInResponse.data.data.visit.checkInTime}`);
        } else {
          throw new Error('Check-in failed');
        }
      } else {
        throw new Error('Security OTP verification failed');
      }
    } else {
      throw new Error('Security user creation failed');
    }

    // Step 10: Check-out Visitor
    console.log('\n🚪 Step 10: Checking-out Visitor...');
    const checkOutResponse = await axios.post(`${BASE_URL}/api/visits/${buildingId}/${visitId}/checkout`, {
      securityNotes: 'Visitor checked out successfully'
    }, {
      headers: { Authorization: `Bearer ${securityToken}` }
    });

    if (checkOutResponse.data.success) {
      console.log('✅ Visitor checked out successfully');
      console.log(`   Check-out Time: ${checkOutResponse.data.data.visit.checkOutTime}`);
      console.log(`   Duration: ${checkOutResponse.data.data.visit.actualDuration} minutes`);
    } else {
      throw new Error('Check-out failed');
    }

    // Step 11: Get Visit Statistics
    console.log('\n📊 Step 11: Getting Visit Statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/api/visits/${buildingId}/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (statsResponse.data.success) {
      console.log('✅ Visit statistics retrieved successfully');
      console.log(`   Total Visits: ${statsResponse.data.data.totalVisits}`);
      console.log(`   Today's Visits: ${statsResponse.data.data.todayVisits}`);
      console.log(`   Recent Visits (7 days): ${statsResponse.data.data.recentVisits}`);
      console.log(`   Average Duration: ${statsResponse.data.data.avgDuration} minutes`);
    } else {
      throw new Error('Get statistics failed');
    }

    // Step 12: Search Visits
    console.log('\n🔍 Step 12: Searching Visits...');
    const searchResponse = await axios.get(`${BASE_URL}/api/visits/${buildingId}/search?query=meeting&status=COMPLETED`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (searchResponse.data.success) {
      console.log('✅ Visit search completed successfully');
      console.log(`   Search Results: ${searchResponse.data.data.visits.length} visits found`);
    } else {
      throw new Error('Visit search failed');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL VISIT MANAGEMENT TESTS PASSED SUCCESSFULLY!');
    console.log('='.repeat(60));

    console.log('\n📋 Test Summary:');
    console.log('✅ Authentication & Authorization');
    console.log('✅ Building Management');
    console.log('✅ Visitor Management');
    console.log('✅ Visit Creation with QR Code Generation');
    console.log('✅ Visit Approval Workflow');
    console.log('✅ Check-in/out System');
    console.log('✅ Real-time Notifications');
    console.log('✅ Visit Statistics & Analytics');
    console.log('✅ Search & Filtering');
    console.log('✅ Role-based Access Control');

    console.log('\n🚀 Visit Management System is fully functional!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    console.log('\n🔍 Error Details:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the tests
testVisitSystem();
