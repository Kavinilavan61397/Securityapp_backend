require("dotenv").config();

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
let authToken = '';
let buildingId = '';
let visitorId = '';

// Test data
const testVisitor = {
  name: 'John Doe',
  phoneNumber: '+919876543210',
  email: 'john.doe@example.com',
  idType: 'AADHAR',
  idNumber: '123456789012',
  purpose: 'Meeting with resident',
  company: 'Tech Corp',
  vehicleNumber: 'MH12AB1234',
  emergencyContact: {
    name: 'Jane Doe',
    phone: '+919876543211',
    relationship: 'Spouse'
  }
};

// Utility functions
const log = (message, data = null) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log(`${'='.repeat(60)}`);
};

const makeRequest = async (method, url, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response;
  } catch (error) {
    if (error.response) {
      return error.response;
    }
    throw error;
  }
};

// Test functions
const testAuthentication = async () => {
  log('Testing Authentication - Login as Super Admin');
  
  // First, we need to verify OTP since the user was just registered
  log('Verifying OTP first...');
  
  // We need to get the userId first by trying to login (which will send OTP)
  const loginData = {
    email: 'superadmin@securitycheck.com',
    password: 'SuperAdmin123!'
  };

  try {
    // Try to login first to get OTP and userId
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
    
    if (loginResponse.data.success && loginResponse.data.data && loginResponse.data.data.userId) {
      const userId = loginResponse.data.data.userId;
      const otpCode = loginResponse.data.data.otpCode;
      
      log('✅ Login initiated, OTP sent', { userId, otpCode });
      
      // Now verify OTP with correct field names
      const otpData = {
        userId: userId,
        otp: otpCode  // Note: field name is 'otp', not 'otpCode'
      };

      const otpResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, otpData);
      
      if (otpResponse.data.success && otpResponse.data.data && otpResponse.data.data.token) {
        authToken = otpResponse.data.data.token;
        log('✅ OTP verification successful', { token: authToken.substring(0, 20) + '...' });
        return true;
      } else {
        log('❌ OTP verification failed', otpResponse.data);
        return false;
      }
    } else {
      log('❌ Login failed - Invalid response structure', loginResponse.data);
      return false;
    }
  } catch (error) {
    log('❌ Authentication error', error.response?.data || error.message);
    return false;
  }
};

const testBuildingCreation = async () => {
  log('Testing Building Creation');
  
  const buildingData = {
    name: 'Test Building for Visitors',
    address: {
      street: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    },
    totalFloors: 10,
    totalFlats: 50,
    contactPhone: '+91-9876543210',
    contactEmail: 'test@building.com',
    features: ['PARKING', 'SECURITY', 'ELEVATOR'],
    operatingHours: {
      open: '06:00',
      close: '22:00',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }
  };

  try {
    const response = await makeRequest('POST', `${BASE_URL}/api/buildings`, buildingData);
    
    if (response.status === 201 && response.data.success) {
      buildingId = response.data.data.buildingId;
      log('✅ Building created successfully', { buildingId });
      return true;
    } else {
      log('❌ Building creation failed', response.data);
      return false;
    }
  } catch (error) {
    log('❌ Building creation error', error.response?.data || error.message);
    return false;
  }
};

const testVisitorCreation = async () => {
  log('Testing Visitor Creation');
  
  const visitorData = {
    ...testVisitor,
    buildingId
  };

  try {
    const response = await makeRequest('POST', `${BASE_URL}/api/visitors/${buildingId}`, visitorData);
    
    if (response.status === 201 && response.data.success) {
      visitorId = response.data.data.visitorId;
      log('✅ Visitor created successfully', { visitorId });
      return true;
    } else {
      log('❌ Visitor creation failed', response.data);
      return false;
    }
  } catch (error) {
    log('❌ Visitor creation error', error.response?.data || error.message);
    return false;
  }
};

const testGetVisitors = async () => {
  log('Testing Get All Visitors');
  
  try {
    const response = await makeRequest('GET', `${BASE_URL}/api/visitors/${buildingId}`);
    
    if (response.status === 200 && response.data.success) {
      log('✅ Get visitors successful', {
        totalVisitors: response.data.data.totalVisitors,
        visitorsCount: response.data.data.visitors.length
      });
      return true;
    } else {
      log('❌ Get visitors failed', response.data);
      return false;
    }
  } catch (error) {
    log('❌ Get visitors error', error.response?.data || error.message);
    return false;
  }
};

const testGetVisitorById = async () => {
  log('Testing Get Visitor by ID');
  
  try {
    const response = await makeRequest('GET', `${BASE_URL}/api/visitors/${buildingId}/${visitorId}`);
    
    if (response.status === 200 && response.data.success) {
      log('✅ Get visitor by ID successful', {
        visitorName: response.data.data.visitor.name,
        visitorEmail: response.data.data.visitor.email,
        visitHistoryCount: response.data.data.visitHistory.length
      });
      return true;
    } else {
      log('❌ Get visitor by ID failed', response.data);
      return false;
    }
  } catch (error) {
    log('❌ Get visitor by ID error', error.response?.data || error.message);
    return false;
  }
};

const testSearchVisitors = async () => {
  log('Testing Search Visitors');
  
  try {
    const response = await makeRequest('GET', `${BASE_URL}/api/visitors/${buildingId}/search?query=John`);
    
    if (response.status === 200 && response.data.success) {
      log('✅ Search visitors successful', {
        query: response.data.data.query,
        totalResults: response.data.data.totalResults,
        resultsCount: response.data.data.results.length
      });
      return true;
    } else {
      log('❌ Search visitors failed', response.data);
      return false;
    }
  } catch (error) {
    log('❌ Search visitors error', error.response?.data || error.message);
    return false;
  }
};

const testUpdateVisitor = async () => {
  log('Testing Update Visitor');
  
  const updateData = {
    company: 'Updated Tech Corp',
    purpose: 'Updated meeting purpose'
  };

  try {
    const response = await makeRequest('PUT', `${BASE_URL}/api/visitors/${buildingId}/${visitorId}`, updateData);
    
    if (response.status === 200 && response.data.success) {
      log('✅ Update visitor successful', {
        visitorId: response.data.data.visitorId,
        updatedAt: response.data.data.updatedAt
      });
      return true;
    } else {
      log('❌ Update visitor failed', response.data);
      return false;
    }
  } catch (error) {
    log('❌ Update visitor error', error.response?.data || error.message);
    return false;
  }
};

const testGetVisitorStats = async () => {
  log('Testing Get Visitor Statistics');
  
  try {
    const response = await makeRequest('GET', `${BASE_URL}/api/visitors/${buildingId}/stats`);
    
    if (response.status === 200 && response.data.success) {
      log('✅ Get visitor stats successful', response.data.data);
      return true;
    } else {
      log('❌ Get visitor stats failed', response.data);
      return false;
    }
  } catch (error) {
    log('❌ Get visitor stats error', error.response?.data || error.message);
    return false;
  }
};

const testPaginationAndFiltering = async () => {
  log('Testing Pagination and Filtering');
  
  try {
    const response = await makeRequest('GET', `${BASE_URL}/api/visitors/${buildingId}?page=1&limit=5&sortBy=name&sortOrder=asc`);
    
    if (response.status === 200 && response.data.success) {
      log('✅ Pagination and filtering successful', {
        currentPage: response.data.data.pagination.currentPage,
        totalPages: response.data.data.pagination.totalPages,
        totalVisitors: response.data.data.pagination.totalVisitors,
        visitorsCount: response.data.data.visitors.length
      });
      return true;
    } else {
      log('❌ Pagination and filtering failed', response.data);
      return false;
    }
  } catch (error) {
    log('❌ Pagination and filtering error', error.response?.data || error.message);
    return false;
  }
};

// Main test execution
const runTests = async () => {
  log('🚀 Starting Visitor Management System Tests');
  
  const tests = [
    { name: 'Authentication', test: testAuthentication },
    { name: 'Building Creation', test: testBuildingCreation },
    { name: 'Visitor Creation', test: testVisitorCreation },
    { name: 'Get All Visitors', test: testGetVisitors },
    { name: 'Get Visitor by ID', test: testGetVisitorById },
    { name: 'Search Visitors', test: testSearchVisitors },
    { name: 'Update Visitor', test: testUpdateVisitor },
    { name: 'Get Visitor Statistics', test: testGetVisitorStats },
    { name: 'Pagination and Filtering', test: testPaginationAndFiltering }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const testCase of tests) {
    try {
      log(`\n🧪 Running Test: ${testCase.name}`);
      const result = await testCase.test();
      if (result) {
        passedTests++;
        log(`✅ ${testCase.name} - PASSED`);
      } else {
        log(`❌ ${testCase.name} - FAILED`);
      }
    } catch (error) {
      log(`❌ ${testCase.name} - ERROR`, error.message);
    }
  }

  // Test summary
  log('📊 Test Results Summary', {
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    successRate: `${((passedTests / totalTests) * 100).toFixed(2)}%`
  });

  if (passedTests === totalTests) {
    log('🎉 ALL TESTS PASSED! Visitor Management System is working perfectly!');
  } else {
    log('⚠️ Some tests failed. Please check the errors above.');
  }
};

// Error handling
process.on('unhandledRejection', (error) => {
  log('❌ Unhandled Promise Rejection', error.message);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('❌ Uncaught Exception', error.message);
  process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    log('❌ Test execution failed', error.message);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testAuthentication,
  testBuildingCreation,
  testVisitorCreation,
  testGetVisitors,
  testGetVisitorById,
  testSearchVisitors,
  testUpdateVisitor,
  testGetVisitorStats,
  testPaginationAndFiltering
};
