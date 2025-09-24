/**
 * COMPREHENSIVE ADMIN FLOW ENDPOINTS TEST
 * Tests all Admin Flow endpoints with proper authentication and examples
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'https://securityapp-backend.vercel.app';
const BUILDING_ID = '68b04099951cc19873fc3dd3'; // Test Building ID

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'buildingadmin@test.com',
  phoneNumber: '+919876543214',
  role: 'BUILDING_ADMIN'
};

const SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@test.com', 
  phoneNumber: '+919876543215',
  role: 'SUPER_ADMIN'
};

let adminToken = '';
let superAdminToken = '';

// Helper function to make authenticated requests
const makeRequest = async (method, url, data = null, token = adminToken) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

// Authentication function
const authenticate = async (credentials) => {
  try {
    // Step 1: Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    console.log('✅ Login successful:', loginResponse.data.message);
    
    // Step 2: Verify OTP (using default OTP: 123456)
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: loginResponse.data.data.user.id,
      otp: '123456'
    });
    
    console.log('✅ OTP verification successful');
    return verifyResponse.data.data.token;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return null;
  }
};

// Test functions
const testEmployeeManagement = async () => {
  console.log('\n🔧 TESTING EMPLOYEE MANAGEMENT ENDPOINTS');
  console.log('=' .repeat(50));
  
  // 1. Create Employee
  console.log('\n1. Creating Employee...');
  const employeeData = {
    name: 'Test Security Guard',
    phoneNumber: '+919876543300',
    email: 'testguard@example.com',
    joiningDate: '2024-01-15',
    employeeType: 'SECURITY_GUARD',
    canLogin: true,
    department: 'Security',
    designation: 'Security Guard',
    workSchedule: {
      startTime: '08:00',
      endTime: '20:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    emergencyContact: {
      name: 'Emergency Contact',
      phone: '+919876543301',
      relationship: 'Brother'
    },
    notes: 'Test employee for admin flow testing'
  };
  
  const createResult = await makeRequest('POST', `/api/employees/${BUILDING_ID}`, employeeData);
  if (createResult.success) {
    console.log('✅ Employee created successfully');
    console.log('Employee ID:', createResult.data.data.employee._id);
    return createResult.data.data.employee._id;
  } else {
    console.log('❌ Employee creation failed:', createResult.error);
    return null;
  }
};

const testEmployeeCRUD = async (employeeId) => {
  if (!employeeId) return;
  
  console.log('\n2. Testing Employee CRUD Operations...');
  
  // Get Employee by ID
  console.log('\n   a) Get Employee by ID...');
  const getResult = await makeRequest('GET', `/api/employees/${BUILDING_ID}/${employeeId}`);
  if (getResult.success) {
    console.log('   ✅ Employee retrieved successfully');
  } else {
    console.log('   ❌ Get employee failed:', getResult.error);
  }
  
  // Update Employee
  console.log('\n   b) Update Employee...');
  const updateData = {
    name: 'Updated Security Guard',
    department: 'Updated Security',
    notes: 'Updated notes for testing'
  };
  
  const updateResult = await makeRequest('PUT', `/api/employees/${BUILDING_ID}/${employeeId}`, updateData);
  if (updateResult.success) {
    console.log('   ✅ Employee updated successfully');
  } else {
    console.log('   ❌ Update employee failed:', updateResult.error);
  }
  
  // Get All Employees
  console.log('\n   c) Get All Employees...');
  const getAllResult = await makeRequest('GET', `/api/employees/${BUILDING_ID}`);
  if (getAllResult.success) {
    console.log('   ✅ All employees retrieved successfully');
    console.log('   Total employees:', getAllResult.data.data.employees.length);
  } else {
    console.log('   ❌ Get all employees failed:', getAllResult.error);
  }
  
  // Get Employee Categories
  console.log('\n   d) Get Employee Categories...');
  const categoriesResult = await makeRequest('GET', '/api/employees/categories');
  if (categoriesResult.success) {
    console.log('   ✅ Employee categories retrieved successfully');
  } else {
    console.log('   ❌ Get categories failed:', categoriesResult.error);
  }
  
  // Generate Employee Code
  console.log('\n   e) Generate Employee Code...');
  const codeResult = await makeRequest('GET', '/api/employees/generate-code');
  if (codeResult.success) {
    console.log('   ✅ Employee code generated successfully');
  } else {
    console.log('   ❌ Generate code failed:', codeResult.error);
  }
  
  // Delete Employee (cleanup)
  console.log('\n   f) Delete Employee (cleanup)...');
  const deleteResult = await makeRequest('DELETE', `/api/employees/${BUILDING_ID}/${employeeId}`);
  if (deleteResult.success) {
    console.log('   ✅ Employee deleted successfully');
  } else {
    console.log('   ❌ Delete employee failed:', deleteResult.error);
  }
};

const testResidentApproval = async () => {
  console.log('\n🏠 TESTING RESIDENT APPROVAL ENDPOINTS');
  console.log('=' .repeat(50));
  
  // 1. Create Resident Approval Request (Public endpoint)
  console.log('\n1. Creating Resident Approval Request...');
  const residentData = {
    name: 'Test Resident',
    email: 'testresident@example.com',
    phoneNumber: '+919876543400',
    age: 25,
    gender: 'MALE',
    flatNumber: '102',
    tenantType: 'TENANT',
    idProof: {
      type: 'AADHAR',
      number: '123456789012'
    },
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456'
    },
    emergencyContact: {
      name: 'Emergency Contact',
      phone: '+919876543401',
      relationship: 'Father'
    },
    notes: 'Test resident for approval testing'
  };
  
  // This is a public endpoint, no auth needed
  try {
    const createResult = await axios.post(`${BASE_URL}/api/resident-approvals/${BUILDING_ID}`, residentData);
    console.log('✅ Resident approval request created successfully');
    console.log('Approval ID:', createResult.data.data.approval._id);
    return createResult.data.data.approval._id;
  } catch (error) {
    console.log('❌ Resident approval creation failed:', error.response?.data || error.message);
    return null;
  }
};

const testResidentApprovalCRUD = async (approvalId) => {
  if (!approvalId) return;
  
  console.log('\n2. Testing Resident Approval CRUD Operations...');
  
  // Get All Resident Approvals
  console.log('\n   a) Get All Resident Approvals...');
  const getAllResult = await makeRequest('GET', `/api/resident-approvals/${BUILDING_ID}`);
  if (getAllResult.success) {
    console.log('   ✅ All resident approvals retrieved successfully');
    console.log('   Total approvals:', getAllResult.data.data.approvals.length);
  } else {
    console.log('   ❌ Get all approvals failed:', getAllResult.error);
  }
  
  // Get Single Approval
  console.log('\n   b) Get Single Approval...');
  const getSingleResult = await makeRequest('GET', `/api/resident-approvals/${BUILDING_ID}/${approvalId}`);
  if (getSingleResult.success) {
    console.log('   ✅ Single approval retrieved successfully');
  } else {
    console.log('   ❌ Get single approval failed:', getSingleResult.error);
  }
  
  // Get Pending Count
  console.log('\n   c) Get Pending Count...');
  const pendingCountResult = await makeRequest('GET', `/api/resident-approvals/${BUILDING_ID}/pending/count`);
  if (pendingCountResult.success) {
    console.log('   ✅ Pending count retrieved successfully');
  } else {
    console.log('   ❌ Get pending count failed:', pendingCountResult.error);
  }
  
  // Get Approval Stats
  console.log('\n   d) Get Approval Stats...');
  const statsResult = await makeRequest('GET', `/api/resident-approvals/${BUILDING_ID}/stats`);
  if (statsResult.success) {
    console.log('   ✅ Approval stats retrieved successfully');
  } else {
    console.log('   ❌ Get stats failed:', statsResult.error);
  }
  
  // Approve Resident
  console.log('\n   e) Approve Resident...');
  const approveData = {
    adminNotes: 'Approved for testing purposes'
  };
  
  const approveResult = await makeRequest('POST', `/api/resident-approvals/${BUILDING_ID}/${approvalId}/approve`, approveData);
  if (approveResult.success) {
    console.log('   ✅ Resident approved successfully');
  } else {
    console.log('   ❌ Approve resident failed:', approveResult.error);
  }
};

const testAdminDashboard = async () => {
  console.log('\n📊 TESTING ADMIN DASHBOARD ENDPOINTS');
  console.log('=' .repeat(50));
  
  // 1. Get Admin Dashboard Overview
  console.log('\n1. Getting Admin Dashboard Overview...');
  const dashboardResult = await makeRequest('GET', `/api/admin-dashboard/${BUILDING_ID}`);
  if (dashboardResult.success) {
    console.log('✅ Admin dashboard retrieved successfully');
    console.log('Dashboard data keys:', Object.keys(dashboardResult.data.data));
  } else {
    console.log('❌ Get dashboard failed:', dashboardResult.error);
  }
  
  // 2. Get Today's Visits
  console.log('\n2. Getting Today\'s Visits...');
  const todayVisitsResult = await makeRequest('GET', `/api/admin-dashboard/${BUILDING_ID}/today-visits`);
  if (todayVisitsResult.success) {
    console.log('✅ Today\'s visits retrieved successfully');
  } else {
    console.log('❌ Get today\'s visits failed:', todayVisitsResult.error);
  }
  
  // 3. Get Recent Activity
  console.log('\n3. Getting Recent Activity...');
  const recentActivityResult = await makeRequest('GET', `/api/admin-dashboard/${BUILDING_ID}/recent-activity`);
  if (recentActivityResult.success) {
    console.log('✅ Recent activity retrieved successfully');
  } else {
    console.log('❌ Get recent activity failed:', recentActivityResult.error);
  }
  
  // 4. Get Quick Actions
  console.log('\n4. Getting Quick Actions...');
  const quickActionsResult = await makeRequest('GET', `/api/admin-dashboard/${BUILDING_ID}/quick-actions`);
  if (quickActionsResult.success) {
    console.log('✅ Quick actions retrieved successfully');
  } else {
    console.log('❌ Get quick actions failed:', quickActionsResult.error);
  }
};

const testMessageSystem = async () => {
  console.log('\n💬 TESTING MESSAGE SYSTEM ENDPOINTS');
  console.log('=' .repeat(50));
  
  // 1. Post a Message
  console.log('\n1. Posting a Message...');
  const messageData = {
    title: 'Test Admin Message',
    content: 'This is a test message posted by the admin for testing purposes.',
    messageType: 'ANNOUNCEMENT',
    priority: 'MEDIUM',
    targetAudience: 'ALL_RESIDENTS',
    tags: ['test', 'admin', 'announcement'],
    isPinned: false
  };
  
  const postResult = await makeRequest('POST', `/api/messages/${BUILDING_ID}`, messageData);
  let messageId = null;
  if (postResult.success) {
    console.log('✅ Message posted successfully');
    console.log('Message ID:', postResult.data.data.message._id);
    messageId = postResult.data.data.message._id;
  } else {
    console.log('❌ Post message failed:', postResult.error);
    return;
  }
  
  // 2. Get All Messages
  console.log('\n2. Getting All Messages...');
  const getAllResult = await makeRequest('GET', `/api/messages/${BUILDING_ID}`);
  if (getAllResult.success) {
    console.log('✅ All messages retrieved successfully');
    console.log('Total messages:', getAllResult.data.data.messages.length);
  } else {
    console.log('❌ Get all messages failed:', getAllResult.error);
  }
  
  // 3. Get Single Message
  console.log('\n3. Getting Single Message...');
  const getSingleResult = await makeRequest('GET', `/api/messages/${BUILDING_ID}/${messageId}`);
  if (getSingleResult.success) {
    console.log('✅ Single message retrieved successfully');
  } else {
    console.log('❌ Get single message failed:', getSingleResult.error);
  }
  
  // 4. Update Message
  console.log('\n4. Updating Message...');
  const updateData = {
    title: 'Updated Test Admin Message',
    content: 'This is an updated test message.',
    priority: 'HIGH',
    isPinned: true
  };
  
  const updateResult = await makeRequest('PUT', `/api/messages/${BUILDING_ID}/${messageId}`, updateData);
  if (updateResult.success) {
    console.log('✅ Message updated successfully');
  } else {
    console.log('❌ Update message failed:', updateResult.error);
  }
  
  // 5. Get Previous Posts
  console.log('\n5. Getting Previous Posts...');
  const previousPostsResult = await makeRequest('GET', `/api/messages/${BUILDING_ID}/previous-posts`);
  if (previousPostsResult.success) {
    console.log('✅ Previous posts retrieved successfully');
  } else {
    console.log('❌ Get previous posts failed:', previousPostsResult.error);
  }
  
  // 6. Delete Message (cleanup)
  console.log('\n6. Deleting Message (cleanup)...');
  const deleteResult = await makeRequest('DELETE', `/api/messages/${BUILDING_ID}/${messageId}`);
  if (deleteResult.success) {
    console.log('✅ Message deleted successfully');
  } else {
    console.log('❌ Delete message failed:', deleteResult.error);
  }
};

// Main test function
const runAllTests = async () => {
  console.log('🚀 STARTING COMPREHENSIVE ADMIN FLOW ENDPOINTS TEST');
  console.log('=' .repeat(60));
  
  try {
    // Authenticate as Building Admin
    console.log('\n🔐 AUTHENTICATING AS BUILDING ADMIN...');
    adminToken = await authenticate(ADMIN_CREDENTIALS);
    if (!adminToken) {
      console.log('❌ Failed to authenticate as Building Admin. Exiting...');
      return;
    }
    
    // Test Employee Management
    const employeeId = await testEmployeeManagement();
    await testEmployeeCRUD(employeeId);
    
    // Test Resident Approval
    const approvalId = await testResidentApproval();
    await testResidentApprovalCRUD(approvalId);
    
    // Test Admin Dashboard
    await testAdminDashboard();
    
    // Test Message System
    await testMessageSystem();
    
    console.log('\n🎉 ALL ADMIN FLOW ENDPOINTS TEST COMPLETED!');
    console.log('=' .repeat(60));
    console.log('✅ Employee Management: Tested');
    console.log('✅ Resident Approval: Tested');
    console.log('✅ Admin Dashboard: Tested');
    console.log('✅ Message System: Tested');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  }
};

// Run the tests
runAllTests();
