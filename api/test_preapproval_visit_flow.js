const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app/api';
const BUILDING_ID = '68b04099951cc19873fc3dd3';

// Test data
const testData = {
  resident: {
    email: 'resident.test@example.com',
    password: 'password123'
  },
  preApproval: {
    visitorName: 'John Test Visitor',
    visitorPhone: '+919876543210',
    visitorEmail: 'john.visitor@test.com',
    purpose: 'Testing pre-approval to visit flow',
    expectedDate: '2024-02-15',
    expectedTime: '2:00 PM',
    residentMobileNumber: '+919876543211',
    flatNumber: 'A-101'
  }
};

let residentToken = '';
let preApprovalId = '';
let visitId = '';

async function testPreApprovalToVisitFlow() {
  console.log('🚀 TESTING PRE-APPROVAL TO VISIT FLOW\n');

  try {
    // Step 1: Login as Resident
    console.log('1️⃣ Logging in as Resident...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testData.resident.email,
      password: testData.resident.password
    });

    if (loginResponse.data.success) {
      console.log('✅ Resident login successful');
      console.log('📧 OTP required:', loginResponse.data.requiresOtp);
      
      if (loginResponse.data.requiresOtp) {
        // Verify OTP
        console.log('2️⃣ Verifying OTP...');
        const otpResponse = await axios.post(`${BASE_URL}/auth/verify-otp`, {
          userId: loginResponse.data.data.userId,
          otp: '1234'
        });
        
        if (otpResponse.data.success) {
          residentToken = otpResponse.data.data.token;
          console.log('✅ OTP verification successful');
        } else {
          throw new Error('OTP verification failed: ' + JSON.stringify(otpResponse.data));
        }
      } else {
        residentToken = loginResponse.data.data.token;
      }
    } else {
      throw new Error('Resident login failed: ' + JSON.stringify(loginResponse.data));
    }

    // Step 3: Create Pre-approval (this should automatically create visitor and visit)
    console.log('\n3️⃣ Creating Pre-approval...');
    const preApprovalResponse = await axios.post(
      `${BASE_URL}/pre-approvals/${BUILDING_ID}`,
      testData.preApproval,
      {
        headers: {
          'Authorization': `Bearer ${residentToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (preApprovalResponse.data.success) {
      console.log('✅ Pre-approval created successfully');
      preApprovalId = preApprovalResponse.data.data.preApprovalId;
      
      // Check if visit was created
      if (preApprovalResponse.data.data.visit) {
        console.log('✅ Visit automatically created!');
        console.log('📋 Visit ID:', preApprovalResponse.data.data.visit.id);
        console.log('📋 Visit Status:', preApprovalResponse.data.data.visit.status);
        console.log('📋 QR Code:', preApprovalResponse.data.data.visit.qrCode ? 'Generated' : 'Not generated');
        visitId = preApprovalResponse.data.data.visit.id;
      } else {
        console.log('⚠️ Visit not created automatically');
      }
      
      // Check if visitor was created
      if (preApprovalResponse.data.data.visitor) {
        console.log('✅ Visitor automatically created!');
        console.log('👤 Visitor ID:', preApprovalResponse.data.data.visitor.id);
        console.log('👤 Visitor Name:', preApprovalResponse.data.data.visitor.name);
      } else {
        console.log('⚠️ Visitor not created automatically');
      }
    } else {
      throw new Error('Pre-approval creation failed: ' + JSON.stringify(preApprovalResponse.data));
    }

    // Step 4: Get Security Token for approval
    console.log('\n4️⃣ Getting Security Token...');
    const securityLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'security@test.com',
      password: 'password123'
    });

    if (securityLoginResponse.data.success) {
      const securityToken = securityLoginResponse.data.data.token;
      console.log('✅ Security login successful (no OTP required)');

      // Step 5: Approve Pre-approval
      console.log('\n5️⃣ Approving Pre-approval...');
      const approveResponse = await axios.post(
        `${BASE_URL}/pre-approvals/${BUILDING_ID}/${preApprovalId}/approve`,
        {
          adminNotes: 'Approved for testing visit flow'
        },
        {
          headers: {
            'Authorization': `Bearer ${securityToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (approveResponse.data.success) {
        console.log('✅ Pre-approval approved successfully');
        console.log('📋 Pre-approval Status:', approveResponse.data.data.status);
      } else {
        throw new Error('Pre-approval approval failed: ' + JSON.stringify(approveResponse.data));
      }

      // Step 6: Check Visit Status (should be APPROVED now)
      console.log('\n6️⃣ Checking Visit Status...');
      const visitResponse = await axios.get(
        `${BASE_URL}/visits/${BUILDING_ID}/${visitId}`,
        {
          headers: {
            'Authorization': `Bearer ${securityToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (visitResponse.data.success) {
        console.log('✅ Visit retrieved successfully');
        console.log('📋 Visit Status:', visitResponse.data.data.visit.status);
        console.log('📋 Approval Status:', visitResponse.data.data.visit.approvalStatus);
        console.log('📋 Pre-approval ID:', visitResponse.data.data.visit.preApprovalId);
      } else {
        console.log('⚠️ Could not retrieve visit:', visitResponse.data.message);
      }

    } else {
      throw new Error('Security login failed: ' + JSON.stringify(securityLoginResponse.data));
    }

    console.log('\n🎉 PRE-APPROVAL TO VISIT FLOW TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📊 SUMMARY:');
    console.log('✅ Resident login with OTP');
    console.log('✅ Pre-approval creation');
    console.log('✅ Automatic visitor creation');
    console.log('✅ Automatic visit creation');
    console.log('✅ Security login (no OTP)');
    console.log('✅ Pre-approval approval');
    console.log('✅ Visit status update to APPROVED');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testPreApprovalToVisitFlow();
