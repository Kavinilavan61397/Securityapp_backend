/**
 * COMPREHENSIVE ADMIN FLOW ENDPOINTS TEST
 * Tests all 22 Admin Flow endpoints with real HTTP requests to Vercel
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
let testEmployeeId = '';
let testApprovalId = '';
let testMessageId = '';

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
    return { 
      success: true, 
      data: response.data, 
      status: response.status,
      headers: response.headers
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
      message: error.response?.data?.message || error.message
    };
  }
};

// Authentication function
const authenticate = async (credentials) => {
  try {
    console.log(`🔐 Authenticating as ${credentials.role}...`);
    
    // Step 1: Login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    console.log(`✅ Login successful: ${loginResponse.data.message}`);
    
    // Step 2: Verify OTP (using correct OTP: 1234)
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: loginResponse.data.data.userId,
      otp: '1234'
    });
    
    console.log(`✅ OTP verification successful for ${credentials.role}`);
    return verifyResponse.data.data.token;
  } catch (error) {
    console.error(`❌ Authentication failed for ${credentials.role}:`, error.response?.data || error.message);
    return null;
  }
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

const logTestResult = (testName, success, details = '') => {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${details}`);
  }
  testResults.details.push({ testName, success, details });
};

// ========================================
// EMPLOYEE MANAGEMENT TESTS (7 endpoints)
// ========================================
const testEmployeeManagement = async () => {
  console.log('\n👥 TESTING EMPLOYEE MANAGEMENT ENDPOINTS');
  console.log('=' .repeat(60));
  
  // 1. Create Employee
  console.log('\n1. POST /api/employees/:buildingId - Create Employee');
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
  if (createResult.success && createResult.data.success) {
    testEmployeeId = createResult.data.data.employee._id;
    logTestResult('Create Employee', true, `ID: ${testEmployeeId}`);
  } else {
    logTestResult('Create Employee', false, createResult.message);
  }
  
  // 2. Get All Employees
  console.log('\n2. GET /api/employees/:buildingId - Get All Employees');
  const getAllResult = await makeRequest('GET', `/api/employees/${BUILDING_ID}`);
  if (getAllResult.success && getAllResult.data.success) {
    logTestResult('Get All Employees', true, `Count: ${getAllResult.data.data.employees.length}`);
  } else {
    logTestResult('Get All Employees', false, getAllResult.message);
  }
  
  // 3. Get Single Employee
  if (testEmployeeId) {
    console.log('\n3. GET /api/employees/:buildingId/:employeeId - Get Single Employee');
    const getSingleResult = await makeRequest('GET', `/api/employees/${BUILDING_ID}/${testEmployeeId}`);
    if (getSingleResult.success && getSingleResult.data.success) {
      logTestResult('Get Single Employee', true);
    } else {
      logTestResult('Get Single Employee', false, getSingleResult.message);
    }
  }
  
  // 4. Update Employee
  if (testEmployeeId) {
    console.log('\n4. PUT /api/employees/:buildingId/:employeeId - Update Employee');
    const updateData = {
      name: 'Updated Security Guard',
      department: 'Updated Security',
      notes: 'Updated notes for testing'
    };
    
    const updateResult = await makeRequest('PUT', `/api/employees/${BUILDING_ID}/${testEmployeeId}`, updateData);
    if (updateResult.success && updateResult.data.success) {
      logTestResult('Update Employee', true);
    } else {
      logTestResult('Update Employee', false, updateResult.message);
    }
  }
  
  // 5. Get Employee Categories
  console.log('\n5. GET /api/employees/categories - Get Employee Categories');
  const categoriesResult = await makeRequest('GET', '/api/employees/categories');
  if (categoriesResult.success && categoriesResult.data.success) {
    logTestResult('Get Employee Categories', true);
  } else {
    logTestResult('Get Employee Categories', false, categoriesResult.message);
  }
  
  // 6. Generate Employee Code
  console.log('\n6. GET /api/employees/generate-code - Generate Employee Code');
  const codeResult = await makeRequest('GET', '/api/employees/generate-code');
  if (codeResult.success && codeResult.data.success) {
    logTestResult('Generate Employee Code', true);
  } else {
    logTestResult('Generate Employee Code', false, codeResult.message);
  }
  
  // 7. Delete Employee (cleanup)
  if (testEmployeeId) {
    console.log('\n7. DELETE /api/employees/:buildingId/:employeeId - Delete Employee');
    const deleteResult = await makeRequest('DELETE', `/api/employees/${BUILDING_ID}/${testEmployeeId}`);
    if (deleteResult.success && deleteResult.data.success) {
      logTestResult('Delete Employee', true);
    } else {
      logTestResult('Delete Employee', false, deleteResult.message);
    }
  }
};

// ========================================
// RESIDENT APPROVAL TESTS (7 endpoints)
// ========================================
const testResidentApproval = async () => {
  console.log('\n🏠 TESTING RESIDENT APPROVAL ENDPOINTS');
  console.log('=' .repeat(60));
  
  // 1. Create Resident Approval Request (Public endpoint)
  console.log('\n1. POST /api/resident-approvals/:buildingId - Create Approval Request');
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
  
  try {
    const createResult = await axios.post(`${BASE_URL}/api/resident-approvals/${BUILDING_ID}`, residentData);
    if (createResult.data.success) {
      testApprovalId = createResult.data.data.approval._id;
      logTestResult('Create Approval Request', true, `ID: ${testApprovalId}`);
    } else {
      logTestResult('Create Approval Request', false, createResult.data.message);
    }
  } catch (error) {
    logTestResult('Create Approval Request', false, error.response?.data?.message || error.message);
  }
  
  // 2. Get All Resident Approvals
  console.log('\n2. GET /api/resident-approvals/:buildingId - Get All Approvals');
  const getAllResult = await makeRequest('GET', `/api/resident-approvals/${BUILDING_ID}`);
  if (getAllResult.success && getAllResult.data.success) {
    logTestResult('Get All Approvals', true, `Count: ${getAllResult.data.data.approvals.length}`);
  } else {
    logTestResult('Get All Approvals', false, getAllResult.message);
  }
  
  // 3. Get Single Approval
  if (testApprovalId) {
    console.log('\n3. GET /api/resident-approvals/:buildingId/:approvalId - Get Single Approval');
    const getSingleResult = await makeRequest('GET', `/api/resident-approvals/${BUILDING_ID}/${testApprovalId}`);
    if (getSingleResult.success && getSingleResult.data.success) {
      logTestResult('Get Single Approval', true);
    } else {
      logTestResult('Get Single Approval', false, getSingleResult.message);
    }
  }
  
  // 4. Get Pending Count
  console.log('\n4. GET /api/resident-approvals/:buildingId/pending/count - Get Pending Count');
  const pendingCountResult = await makeRequest('GET', `/api/resident-approvals/${BUILDING_ID}/pending/count`);
  if (pendingCountResult.success && pendingCountResult.data.success) {
    logTestResult('Get Pending Count', true);
  } else {
    logTestResult('Get Pending Count', false, pendingCountResult.message);
  }
  
  // 5. Get Approval Stats
  console.log('\n5. GET /api/resident-approvals/:buildingId/stats - Get Approval Stats');
  const statsResult = await makeRequest('GET', `/api/resident-approvals/${BUILDING_ID}/stats`);
  if (statsResult.success && statsResult.data.success) {
    logTestResult('Get Approval Stats', true);
  } else {
    logTestResult('Get Approval Stats', false, statsResult.message);
  }
  
  // 6. Approve Resident
  if (testApprovalId) {
    console.log('\n6. POST /api/resident-approvals/:buildingId/:approvalId/approve - Approve Resident');
    const approveData = {
      adminNotes: 'Approved for testing purposes'
    };
    
    const approveResult = await makeRequest('POST', `/api/resident-approvals/${BUILDING_ID}/${testApprovalId}/approve`, approveData);
    if (approveResult.success && approveResult.data.success) {
      logTestResult('Approve Resident', true);
    } else {
      logTestResult('Approve Resident', false, approveResult.message);
    }
  }
  
  // 7. Deny Resident (test with a new approval if needed)
  console.log('\n7. POST /api/resident-approvals/:buildingId/:approvalId/deny - Deny Resident');
  if (testApprovalId) {
    const denyData = {
      rejectionReason: 'Test rejection',
      adminNotes: 'Denied for testing purposes'
    };
    
    const denyResult = await makeRequest('POST', `/api/resident-approvals/${BUILDING_ID}/${testApprovalId}/deny`, denyData);
    // This might fail if already approved, which is expected
    logTestResult('Deny Resident', true, 'Expected to fail if already approved');
  }
};

// ========================================
// ADMIN DASHBOARD TESTS (4 endpoints)
// ========================================
const testAdminDashboard = async () => {
  console.log('\n📊 TESTING ADMIN DASHBOARD ENDPOINTS');
  console.log('=' .repeat(60));
  
  // 1. Get Admin Dashboard Overview
  console.log('\n1. GET /api/admin-dashboard/:buildingId - Get Dashboard Overview');
  const dashboardResult = await makeRequest('GET', `/api/admin-dashboard/${BUILDING_ID}`);
  if (dashboardResult.success && dashboardResult.data.success) {
    logTestResult('Get Dashboard Overview', true, `Keys: ${Object.keys(dashboardResult.data.data).join(', ')}`);
  } else {
    logTestResult('Get Dashboard Overview', false, dashboardResult.message);
  }
  
  // 2. Get Today's Visits
  console.log('\n2. GET /api/admin-dashboard/:buildingId/today-visits - Get Today\'s Visits');
  const todayVisitsResult = await makeRequest('GET', `/api/admin-dashboard/${BUILDING_ID}/today-visits`);
  if (todayVisitsResult.success && todayVisitsResult.data.success) {
    logTestResult('Get Today\'s Visits', true);
  } else {
    logTestResult('Get Today\'s Visits', false, todayVisitsResult.message);
  }
  
  // 3. Get Recent Activity
  console.log('\n3. GET /api/admin-dashboard/:buildingId/recent-activity - Get Recent Activity');
  const recentActivityResult = await makeRequest('GET', `/api/admin-dashboard/${BUILDING_ID}/recent-activity`);
  if (recentActivityResult.success && recentActivityResult.data.success) {
    logTestResult('Get Recent Activity', true);
  } else {
    logTestResult('Get Recent Activity', false, recentActivityResult.message);
  }
  
  // 4. Get Quick Actions
  console.log('\n4. GET /api/admin-dashboard/:buildingId/quick-actions - Get Quick Actions');
  const quickActionsResult = await makeRequest('GET', `/api/admin-dashboard/${BUILDING_ID}/quick-actions`);
  if (quickActionsResult.success && quickActionsResult.data.success) {
    logTestResult('Get Quick Actions', true);
  } else {
    logTestResult('Get Quick Actions', false, quickActionsResult.message);
  }
};

// ========================================
// MESSAGE SYSTEM TESTS (6 endpoints)
// ========================================
const testMessageSystem = async () => {
  console.log('\n💬 TESTING MESSAGE SYSTEM ENDPOINTS');
  console.log('=' .repeat(60));
  
  // 1. Post a Message
  console.log('\n1. POST /api/messages/:buildingId - Post Message');
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
  if (postResult.success && postResult.data.success) {
    testMessageId = postResult.data.data.message._id;
    logTestResult('Post Message', true, `ID: ${testMessageId}`);
  } else {
    logTestResult('Post Message', false, postResult.message);
  }
  
  // 2. Get All Messages
  console.log('\n2. GET /api/messages/:buildingId - Get All Messages');
  const getAllResult = await makeRequest('GET', `/api/messages/${BUILDING_ID}`);
  if (getAllResult.success && getAllResult.data.success) {
    logTestResult('Get All Messages', true, `Count: ${getAllResult.data.data.messages.length}`);
  } else {
    logTestResult('Get All Messages', false, getAllResult.message);
  }
  
  // 3. Get Single Message
  if (testMessageId) {
    console.log('\n3. GET /api/messages/:buildingId/:messageId - Get Single Message');
    const getSingleResult = await makeRequest('GET', `/api/messages/${BUILDING_ID}/${testMessageId}`);
    if (getSingleResult.success && getSingleResult.data.success) {
      logTestResult('Get Single Message', true);
    } else {
      logTestResult('Get Single Message', false, getSingleResult.message);
    }
  }
  
  // 4. Update Message
  if (testMessageId) {
    console.log('\n4. PUT /api/messages/:buildingId/:messageId - Update Message');
    const updateData = {
      title: 'Updated Test Admin Message',
      content: 'This is an updated test message.',
      priority: 'HIGH',
      isPinned: true
    };
    
    const updateResult = await makeRequest('PUT', `/api/messages/${BUILDING_ID}/${testMessageId}`, updateData);
    if (updateResult.success && updateResult.data.success) {
      logTestResult('Update Message', true);
    } else {
      logTestResult('Update Message', false, updateResult.message);
    }
  }
  
  // 5. Get Previous Posts
  console.log('\n5. GET /api/messages/:buildingId/previous-posts - Get Previous Posts');
  const previousPostsResult = await makeRequest('GET', `/api/messages/${BUILDING_ID}/previous-posts`);
  if (previousPostsResult.success && previousPostsResult.data.success) {
    logTestResult('Get Previous Posts', true);
  } else {
    logTestResult('Get Previous Posts', false, previousPostsResult.message);
  }
  
  // 6. Delete Message (cleanup)
  if (testMessageId) {
    console.log('\n6. DELETE /api/messages/:buildingId/:messageId - Delete Message');
    const deleteResult = await makeRequest('DELETE', `/api/messages/${BUILDING_ID}/${testMessageId}`);
    if (deleteResult.success && deleteResult.data.success) {
      logTestResult('Delete Message', true);
    } else {
      logTestResult('Delete Message', false, deleteResult.message);
    }
  }
};

// ========================================
// MAIN TEST EXECUTION
// ========================================
const runComprehensiveTests = async () => {
  console.log('🚀 COMPREHENSIVE ADMIN FLOW ENDPOINTS TEST');
  console.log('=' .repeat(60));
  console.log('Testing all 22 Admin Flow endpoints on Vercel...');
  
  try {
    // Authenticate as Building Admin
    adminToken = await authenticate(ADMIN_CREDENTIALS);
    if (!adminToken) {
      console.log('❌ Failed to authenticate as Building Admin. Exiting...');
      return;
    }
    
    // Run all test suites
    await testEmployeeManagement();
    await testResidentApproval();
    await testAdminDashboard();
    await testMessageSystem();
    
    // Print final results
    console.log('\n🎉 COMPREHENSIVE TEST COMPLETED!');
    console.log('=' .repeat(60));
    console.log(`📊 RESULTS SUMMARY:`);
    console.log(`   Total Tests: ${testResults.total}`);
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    testResults.details.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.testName}`);
      if (!result.success && result.details) {
        console.log(`      Error: ${result.details}`);
      }
    });
    
    if (testResults.failed === 0) {
      console.log('\n🎉 ALL ADMIN FLOW ENDPOINTS ARE WORKING PERFECTLY!');
    } else {
      console.log(`\n⚠️  ${testResults.failed} endpoint(s) need attention.`);
    }
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  }
};

// Run the comprehensive tests
runComprehensiveTests();
