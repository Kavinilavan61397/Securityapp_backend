const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';
const BUILDING_ID = '68b04099951cc19873fc3dd3';

async function completeSecurityFlowTest() {
  try {
    console.log('🚀 COMPLETE SECURITY FLOW TEST\n');
    console.log(`🏢 Building ID: ${BUILDING_ID}\n`);

    // Step 1: Login as Security
    console.log('1️⃣ LOGGING IN AS SECURITY...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'security@test.com',
      phoneNumber: '+919876543213',
      role: 'SECURITY'
    });

    console.log('✅ Login successful');
    const userId = loginResponse.data.data.userId;

    // Step 2: Verify OTP
    console.log('\n2️⃣ VERIFYING OTP...');
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      otp: '1234'
    });

    const token = otpResponse.data.data.token;
    console.log('✅ OTP verified successfully');
    console.log(`🔑 Token: ${token.substring(0, 20)}...`);

    // Step 3: Create Test Visitors (POST requests)
    console.log('\n3️⃣ CREATING TEST VISITORS...');
    
    const visitors = [];
    
    // Create Cab Driver Visitor
    console.log('   Creating Cab Driver...');
    const cabVisitor = await axios.post(`${BASE_URL}/api/visitors/${BUILDING_ID}`, {
      name: 'Uber Driver John',
      phoneNumber: '+919876543210',
      email: 'john@uber.com',
      Date: '15/01/2024',
      Time: '10:00 am',
      idType: 'AADHAR',
      idNumber: '123456789012',
      purpose: 'Pickup',
      company: 'Uber',
      vehicleNumber: 'MH01AB1234',
      emergencyContact: '+919876543211',
      visitorCategory: 'CAB_DRIVER',
      serviceType: 'Uber',
      vehicleType: 'CAR'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    visitors.push(cabVisitor.data.data.visitor);
    console.log('   ✅ Cab Driver created');

    // Create Delivery Agent Visitor
    console.log('   Creating Delivery Agent...');
    const deliveryVisitor = await axios.post(`${BASE_URL}/api/visitors/${BUILDING_ID}`, {
      name: 'Amazon Delivery Agent',
      phoneNumber: '+919876543220',
      email: 'delivery@amazon.com',
      Date: '15/01/2024',
      Time: '2:00 pm',
      idType: 'AADHAR',
      idNumber: '987654321098',
      purpose: 'Package delivery',
      company: 'Amazon',
      vehicleNumber: 'MH02CD5678',
      emergencyContact: '+919876543221',
      visitorCategory: 'DELIVERY_AGENT',
      serviceType: 'Amazon Delivery Agent',
      vehicleType: 'BIKE'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    visitors.push(deliveryVisitor.data.data.visitor);
    console.log('   ✅ Delivery Agent created');

    // Create Flat Employee Visitor
    console.log('   Creating Flat Employee...');
    const employeeVisitor = await axios.post(`${BASE_URL}/api/visitors/${BUILDING_ID}`, {
      name: 'Electrician Mike',
      phoneNumber: '+919876543230',
      email: 'mike@electrician.com',
      Date: '15/01/2024',
      Time: '3:00 pm',
      idType: 'AADHAR',
      idNumber: '112233445566',
      purpose: 'Electrical repair',
      visitorCategory: 'FLAT_EMPLOYEE',
      serviceType: 'Electrician',
      employeeCode: 'EMP001',
      flatNumbers: ['A-101', 'A-102']
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    visitors.push(employeeVisitor.data.data.visitor);
    console.log('   ✅ Flat Employee created');

    // Create Other Visitor
    console.log('   Creating Other Visitor...');
    const otherVisitor = await axios.post(`${BASE_URL}/api/visitors/${BUILDING_ID}`, {
      name: 'Guest Visitor',
      phoneNumber: '+919876543240',
      email: 'guest@example.com',
      Date: '15/01/2024',
      Time: '4:00 pm',
      idType: 'AADHAR',
      idNumber: '556677889900',
      purpose: 'Personal visit',
      visitorCategory: 'OTHER'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    visitors.push(otherVisitor.data.data.visitor);
    console.log('   ✅ Other Visitor created');

    console.log(`\n✅ Created ${visitors.length} visitors successfully!`);

    // Step 4: Create Visits (POST requests)
    console.log('\n4️⃣ CREATING TEST VISITS...');
    
    const visits = [];
    
    // Create visit for Cab Driver
    console.log('   Creating visit for Cab Driver...');
    const cabVisit = await axios.post(`${BASE_URL}/api/visits/${BUILDING_ID}`, {
      visitorId: visitors[0]._id,
      hostId: userId, // Using security user as host for testing
      purpose: 'Pickup',
      scheduledDate: '2024-01-15',
      scheduledTime: '10:00 AM',
      expectedDuration: 30,
      approvalStatus: 'APPROVED'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    visits.push(cabVisit.data.data.visit);
    console.log('   ✅ Cab Driver visit created');

    // Create visit for Delivery Agent
    console.log('   Creating visit for Delivery Agent...');
    const deliveryVisit = await axios.post(`${BASE_URL}/api/visits/${BUILDING_ID}`, {
      visitorId: visitors[1]._id,
      hostId: userId,
      purpose: 'Package delivery',
      scheduledDate: '2024-01-15',
      scheduledTime: '2:00 PM',
      expectedDuration: 15,
      approvalStatus: 'PENDING'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    visits.push(deliveryVisit.data.data.visit);
    console.log('   ✅ Delivery Agent visit created');

    // Create visit for Flat Employee
    console.log('   Creating visit for Flat Employee...');
    const employeeVisit = await axios.post(`${BASE_URL}/api/visits/${BUILDING_ID}`, {
      visitorId: visitors[2]._id,
      hostId: userId,
      purpose: 'Electrical repair',
      scheduledDate: '2024-01-15',
      scheduledTime: '3:00 PM',
      expectedDuration: 60,
      approvalStatus: 'APPROVED'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    visits.push(employeeVisit.data.data.visit);
    console.log('   ✅ Flat Employee visit created');

    console.log(`\n✅ Created ${visits.length} visits successfully!`);

    // Step 5: Check-in some visits (POST requests)
    console.log('\n5️⃣ CHECKING IN VISITS...');
    
    // Check-in Cab Driver
    console.log('   Checking in Cab Driver...');
    await axios.post(`${BASE_URL}/api/visits/${BUILDING_ID}/${visits[0]._id}/check-in`, {
      notes: 'Driver arrived on time'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('   ✅ Cab Driver checked in');

    // Check-in Flat Employee
    console.log('   Checking in Flat Employee...');
    await axios.post(`${BASE_URL}/api/visits/${BUILDING_ID}/${visits[2]._id}/check-in`, {
      notes: 'Electrician ready for work'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('   ✅ Flat Employee checked in');

    // Step 6: Now test GET requests with real data
    console.log('\n6️⃣ TESTING GET REQUESTS WITH REAL DATA...');

    // Test Security Dashboard
    console.log('\n📊 TESTING SECURITY DASHBOARD...');
    const dashboardResponse = await axios.get(`${BASE_URL}/api/security/dashboard/${BUILDING_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Dashboard working!');
    console.log('📋 Dashboard Data:', JSON.stringify(dashboardResponse.data, null, 2));

    // Test Today's Visits
    console.log('\n📅 TESTING TODAY\'S VISITS...');
    const todayVisitsResponse = await axios.get(`${BASE_URL}/api/security/today-visits/${BUILDING_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Today visits working!');
    console.log('📋 Today Visits:', JSON.stringify(todayVisitsResponse.data, null, 2));

    // Test Recent Activity
    console.log('\n🔄 TESTING RECENT ACTIVITY...');
    const recentActivityResponse = await axios.get(`${BASE_URL}/api/security/recent-activity/${BUILDING_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Recent activity working!');
    console.log('📋 Recent Activity:', JSON.stringify(recentActivityResponse.data, null, 2));

    // Test Quick Actions
    console.log('\n⚡ TESTING QUICK ACTIONS...');
    const quickActionsResponse = await axios.get(`${BASE_URL}/api/security/quick-actions/${BUILDING_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Quick actions working!');
    console.log('📋 Quick Actions:', JSON.stringify(quickActionsResponse.data, null, 2));

    // Test Visitor Categories (no auth needed)
    console.log('\n🏷️ TESTING VISITOR CATEGORIES...');
    const categoriesResponse = await axios.get(`${BASE_URL}/api/visitor-categories`);
    console.log('✅ Visitor categories working!');
    console.log('📋 Categories:', JSON.stringify(categoriesResponse.data, null, 2));

    // Test QR Code System
    console.log('\n📱 TESTING QR CODE SYSTEM...');
    const qrCodeResponse = await axios.get(`${BASE_URL}/api/visits/${BUILDING_ID}/${visits[0]._id}/qr-code`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ QR Code working!');
    console.log('📋 QR Code:', JSON.stringify(qrCodeResponse.data, null, 2));

    // Test Call Integration
    console.log('\n📞 TESTING CALL INTEGRATION...');
    const callResponse = await axios.get(`${BASE_URL}/api/calls/building-admin/${BUILDING_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Call integration working!');
    console.log('📋 Call Data:', JSON.stringify(callResponse.data, null, 2));

    console.log('\n🎉 ALL SECURITY FLOW TESTS COMPLETED SUCCESSFULLY!');
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Created ${visitors.length} visitors`);
    console.log(`✅ Created ${visits.length} visits`);
    console.log(`✅ Checked in 2 visits`);
    console.log(`✅ Tested all GET endpoints with real data`);
    console.log(`✅ All security flow features working!`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 SOLUTION: Make sure you\'re logged in with a valid token');
    } else if (error.response?.status === 404) {
      console.log('\n💡 SOLUTION: Check if the building ID is correct');
    }
  }
}

completeSecurityFlowTest();
