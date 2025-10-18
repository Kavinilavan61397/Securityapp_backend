const axios = require('axios');

// Configuration
const BASE_URL = 'https://securityapp-backend.vercel.app';
const TEST_BUILDING_ID = '68b04099951cc19873fc3dd3'; // Replace with actual building ID

// Test data
const testMaintenanceRequest = {
  description: 'Leaky faucet in kitchen sink needs immediate attention. Water is dripping continuously and causing water damage to the cabinet below.',
  imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  location: 'Kitchen',
  flatNumber: '77A'
};

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(method, url, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(data && { data })
  };

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status || 500 
    };
  }
}

// Test functions
async function testCreateMaintenanceRequest() {
  console.log('\n🔧 Testing Create Maintenance Request...');
  
  // First, get a token (you'll need to replace this with actual login)
  const loginData = {
    loginIdentifier: 'thaniya@gmail.com', // Replace with actual test user
    password: 'password123' // Replace with actual password
  };
  
  const loginResult = await makeAuthenticatedRequest('POST', '/api/auth/login', loginData);
  
  if (!loginResult.success) {
    console.log('❌ Login failed:', loginResult.error);
    return null;
  }
  
  const token = loginResult.data.data.token;
  console.log('✅ Login successful');
  
  // Create maintenance request
  const result = await makeAuthenticatedRequest(
    'POST', 
    `/api/maintenance-requests/${TEST_BUILDING_ID}`, 
    testMaintenanceRequest, 
    token
  );
  
  if (result.success) {
    console.log('✅ Create maintenance request successful');
    console.log('📋 Request ID:', result.data.data.request.requestId);
    console.log('📝 Description:', result.data.data.request.description);
    console.log('🖼️ Has Image:', !!result.data.data.request.imageUrl);
    return result.data.data.request.requestId;
  } else {
    console.log('❌ Create maintenance request failed:', result.error);
    return null;
  }
}

async function testGetMaintenanceRequests(requestId) {
  console.log('\n📋 Testing Get All Maintenance Requests...');
  
  const loginData = {
    loginIdentifier: 'thaniya@gmail.com',
    password: 'password123'
  };
  
  const loginResult = await makeAuthenticatedRequest('POST', '/api/auth/login', loginData);
  
  if (!loginResult.success) {
    console.log('❌ Login failed:', loginResult.error);
    return;
  }
  
  const token = loginResult.data.data.token;
  
  const result = await makeAuthenticatedRequest(
    'GET', 
    `/api/maintenance-requests/${TEST_BUILDING_ID}?page=1&limit=10`, 
    null, 
    token
  );
  
  if (result.success) {
    console.log('✅ Get maintenance requests successful');
    console.log('📊 Total requests:', result.data.data.pagination.totalDocs);
    console.log('📄 Current page:', result.data.data.pagination.page);
    console.log('📋 Requests found:', result.data.data.requests.length);
    
    if (result.data.data.requests.length > 0) {
      const firstRequest = result.data.data.requests[0];
      console.log('🔍 First request ID:', firstRequest.requestId);
      console.log('📝 First request description:', firstRequest.description.substring(0, 50) + '...');
    }
  } else {
    console.log('❌ Get maintenance requests failed:', result.error);
  }
}

async function testGetSpecificMaintenanceRequest(requestId) {
  if (!requestId) {
    console.log('\n⏭️ Skipping specific request test (no request ID)');
    return;
  }
  
  console.log('\n🔍 Testing Get Specific Maintenance Request...');
  
  const loginData = {
    loginIdentifier: 'thaniya@gmail.com',
    password: 'password123'
  };
  
  const loginResult = await makeAuthenticatedRequest('POST', '/api/auth/login', loginData);
  
  if (!loginResult.success) {
    console.log('❌ Login failed:', loginResult.error);
    return;
  }
  
  const token = loginResult.data.data.token;
  
  const result = await makeAuthenticatedRequest(
    'GET', 
    `/api/maintenance-requests/${TEST_BUILDING_ID}/${requestId}`, 
    null, 
    token
  );
  
  if (result.success) {
    console.log('✅ Get specific maintenance request successful');
    console.log('📋 Request ID:', result.data.data.request.requestId);
    console.log('📝 Description:', result.data.data.request.description);
    console.log('📊 Status:', result.data.data.request.status);
    console.log('🖼️ Has Image:', !!result.data.data.request.imageUrl);
    console.log('👤 Requester:', result.data.data.request.requester.name);
  } else {
    console.log('❌ Get specific maintenance request failed:', result.error);
  }
}

async function testUpdateMaintenanceRequest(requestId) {
  if (!requestId) {
    console.log('\n⏭️ Skipping update test (no request ID)');
    return;
  }
  
  console.log('\n✏️ Testing Update Maintenance Request...');
  
  const loginData = {
    loginIdentifier: 'thaniya@gmail.com',
    password: 'password123'
  };
  
  const loginResult = await makeAuthenticatedRequest('POST', '/api/auth/login', loginData);
  
  if (!loginResult.success) {
    console.log('❌ Login failed:', loginResult.error);
    return;
  }
  
  const token = loginResult.data.data.token;
  
  const updateData = {
    status: 'IN_PROGRESS',
    adminNotes: 'Maintenance team has been assigned. Work will begin within 2 hours.'
  };
  
  const result = await makeAuthenticatedRequest(
    'PUT', 
    `/api/maintenance-requests/${TEST_BUILDING_ID}/${requestId}`, 
    updateData, 
    token
  );
  
  if (result.success) {
    console.log('✅ Update maintenance request successful');
    console.log('📊 New status:', result.data.data.request.status);
    console.log('📝 Admin notes:', result.data.data.request.adminNotes);
  } else {
    console.log('❌ Update maintenance request failed:', result.error);
  }
}

async function testGetMaintenanceRequestStats() {
  console.log('\n📊 Testing Get Maintenance Request Statistics...');
  
  const loginData = {
    loginIdentifier: 'thaniya@gmail.com',
    password: 'password123'
  };
  
  const loginResult = await makeAuthenticatedRequest('POST', '/api/auth/login', loginData);
  
  if (!loginResult.success) {
    console.log('❌ Login failed:', loginResult.error);
    return;
  }
  
  const token = loginResult.data.data.token;
  
  const result = await makeAuthenticatedRequest(
    'GET', 
    `/api/maintenance-requests/${TEST_BUILDING_ID}/stats`, 
    null, 
    token
  );
  
  if (result.success) {
    console.log('✅ Get maintenance request statistics successful');
    console.log('📊 Total requests:', result.data.data.totalRequests);
    console.log('⏳ Pending requests:', result.data.data.pendingRequests);
    console.log('🔧 In progress requests:', result.data.data.inProgressRequests);
    console.log('✅ Completed requests:', result.data.data.completedRequests);
    console.log('❌ Cancelled requests:', result.data.data.cancelledRequests);
    console.log('📅 Today requests:', result.data.data.todayRequests);
  } else {
    console.log('❌ Get maintenance request statistics failed:', result.error);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Maintenance Request System Tests');
  console.log('==========================================');
  
  try {
    // Test 1: Create maintenance request
    const requestId = await testCreateMaintenanceRequest();
    
    // Test 2: Get all maintenance requests
    await testGetMaintenanceRequests(requestId);
    
    // Test 3: Get specific maintenance request
    await testGetSpecificMaintenanceRequest(requestId);
    
    // Test 4: Update maintenance request
    await testUpdateMaintenanceRequest(requestId);
    
    // Test 5: Get statistics
    await testGetMaintenanceRequestStats();
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run tests
runTests();
