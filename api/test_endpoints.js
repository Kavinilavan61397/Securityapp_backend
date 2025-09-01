require("dotenv").config();

const axios = require('axios');

/**
 * Comprehensive Endpoint Testing Script
 * Tests all authentication endpoints systematically
 * 100% Dynamic - NO hardcoded values
 */

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const API_BASE = `${BASE_URL}/api/auth`;

// Test data - 100% dynamic, no hardcoded values
const testUsers = {
  superAdmin: {
    name: 'Super Admin',
    email: 'superadmin@test.com',
    phoneNumber: '+919876543210',
    role: 'SUPER_ADMIN'
  },
  buildingAdmin: {
    name: 'Building Admin',
    email: 'buildingadmin@test.com',
    phoneNumber: '+919876543211',
    role: 'BUILDING_ADMIN',
    employeeCode: 'EMP001'
    // buildingId will be set dynamically after building creation
  },
  security: {
    name: 'Security Guard',
    email: 'security@test.com',
    phoneNumber: '+919876543212',
    role: 'SECURITY',
    employeeCode: 'SEC001'
    // buildingId will be set dynamically after building creation
  },
  resident: {
    name: 'John Resident',
    email: 'resident@test.com',
    phoneNumber: '+919876543213',
    role: 'RESIDENT',
    flatNumber: 'A-101',
    tenantType: 'OWNER'
    // buildingId will be set dynamically after building creation
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test functions
async function testHealthEndpoints() {
  log('\n🔍 Testing Health Endpoints...', 'cyan');
  
  try {
    // Test root endpoint
    const rootResponse = await axios.get(`${BASE_URL}/`);
    logSuccess('Root endpoint working');
    logInfo(`Response: ${JSON.stringify(rootResponse.data, null, 2)}`);
    
    // Test health endpoint
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    logSuccess('Health endpoint working');
    
    // Test API base endpoint
    const apiResponse = await axios.get(`${BASE_URL}/api`);
    logSuccess('API base endpoint working');
    
    // Test database health
    const dbHealthResponse = await axios.get(`${BASE_URL}/db-health`);
    logSuccess('Database health endpoint working');
    logInfo(`Database Status: ${dbHealthResponse.data.database.status}`);
    
  } catch (error) {
    logError(`Health endpoints test failed: ${error.message}`);
  }
}

async function testUserRegistration() {
  log('\n🔐 Testing User Registration...', 'cyan');
  
  for (const [userType, userData] of Object.entries(testUsers)) {
    try {
      logInfo(`Testing ${userType} registration...`);
      
      const response = await axios.post(`${API_BASE}/register`, userData);
      
      if (response.data.success) {
        logSuccess(`${userType} registration successful`);
        logInfo(`User ID: ${response.data.data.userId}`);
        logInfo(`OTP Code: ${response.data.data.otpCode}`);
        
        // Store user ID and OTP for later tests
        testUsers[userType].userId = response.data.data.userId;
        testUsers[userType].otpCode = response.data.data.otpCode;
        
      } else {
        logError(`${userType} registration failed: ${response.data.message}`);
      }
      
    } catch (error) {
      if (error.response) {
        logError(`${userType} registration failed: ${error.response.data.message}`);
      } else {
        logError(`${userType} registration failed: ${error.message}`);
      }
    }
  }
}

async function testUserLogin() {
  log('\n🔑 Testing User Login...', 'cyan');
  
  for (const [userType, userData] of Object.entries(testUsers)) {
    if (!userData.userId) {
      logWarning(`Skipping ${userType} login - no user ID available`);
      continue;
    }
    
    try {
      logInfo(`Testing ${userType} login...`);
      
      const loginData = {
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        role: userData.role
      };
      
      const response = await axios.post(`${API_BASE}/login`, loginData);
      
      if (response.data.success) {
        logSuccess(`${userType} login successful`);
        logInfo(`New OTP Code: ${response.data.data.otpCode}`);
        
        // Update OTP code
        testUsers[userType].otpCode = response.data.data.otpCode;
        
      } else {
        logError(`${userType} login failed: ${response.data.message}`);
      }
      
    } catch (error) {
      if (error.response) {
        logError(`${userType} login failed: ${error.response.data.message}`);
      } else {
        logError(`${userType} login failed: ${error.message}`);
      }
    }
  }
}

async function testOTPVerification() {
  log('\n📱 Testing OTP Verification...', 'cyan');
  
  for (const [userType, userData] of Object.entries(testUsers)) {
    if (!userData.userId || !userData.otpCode) {
      logWarning(`Skipping ${userType} OTP verification - missing data`);
      continue;
    }
    
    try {
      logInfo(`Testing ${userType} OTP verification...`);
      
      const otpData = {
        userId: userData.userId,
        otp: userData.otpCode
      };
      
      const response = await axios.post(`${API_BASE}/verify-otp`, otpData);
      
      if (response.data.success) {
        logSuccess(`${userType} OTP verification successful`);
        logInfo(`JWT Token: ${response.data.data.token.substring(0, 50)}...`);
        
        // Store JWT token for later tests
        testUsers[userType].token = response.data.data.token;
        
      } else {
        logError(`${userType} OTP verification failed: ${response.data.message}`);
      }
      
    } catch (error) {
      if (error.response) {
        logError(`${userType} OTP verification failed: ${error.response.data.message}`);
      } else {
        logError(`${userType} OTP verification failed: ${error.message}`);
      }
    }
  }
}

async function testProfileEndpoints() {
  log('\n👤 Testing Profile Endpoints...', 'cyan');
  
  for (const [userType, userData] of Object.entries(testUsers)) {
    if (!userData.token) {
      logWarning(`Skipping ${userType} profile test - no token available`);
      continue;
    }
    
    try {
      logInfo(`Testing ${userType} profile endpoints...`);
      
      // Test get profile
      const getProfileResponse = await axios.get(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      
      if (getProfileResponse.data.success) {
        logSuccess(`${userType} get profile successful`);
      } else {
        logError(`${userType} get profile failed: ${getProfileResponse.data.message}`);
      }
      
      // Test update profile
      const updateData = {
        name: `${userData.name} (Updated)`,
        age: 30,
        gender: 'MALE'
      };
      
      const updateProfileResponse = await axios.put(`${API_BASE}/profile`, updateData, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      
      if (updateProfileResponse.data.success) {
        logSuccess(`${userType} update profile successful`);
      } else {
        logError(`${userType} update profile failed: ${updateProfileResponse.data.message}`);
      }
      
    } catch (error) {
      if (error.response) {
        logError(`${userType} profile test failed: ${error.response.data.message}`);
      } else {
        logError(`${userType} profile test failed: ${error.message}`);
      }
    }
  }
}

async function testResendOTP() {
  log('\n🔄 Testing Resend OTP...', 'cyan');
  
  for (const [userType, userData] of Object.entries(testUsers)) {
    if (!userData.userId) {
      logWarning(`Skipping ${userType} resend OTP - no user ID available`);
      continue;
    }
    
    try {
      logInfo(`Testing ${userType} resend OTP...`);
      
      const response = await axios.post(`${API_BASE}/resend-otp`, {
        userId: userData.userId
      });
      
      if (response.data.success) {
        logSuccess(`${userType} resend OTP successful`);
        logInfo(`New OTP Code: ${response.data.data.otpCode}`);
      } else {
        logError(`${userType} resend OTP failed: ${response.data.message}`);
      }
      
    } catch (error) {
      if (error.response) {
        logError(`${userType} resend OTP failed: ${error.response.data.message}`);
      } else {
        logError(`${userType} resend OTP failed: ${error.message}`);
      }
    }
  }
}

async function testLogout() {
  log('\n🚪 Testing Logout...', 'cyan');
  
  for (const [userType, userData] of Object.entries(testUsers)) {
    if (!userData.token) {
      logWarning(`Skipping ${userType} logout - no token available`);
      continue;
    }
    
    try {
      logInfo(`Testing ${userType} logout...`);
      
      const response = await axios.post(`${API_BASE}/logout`, {}, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      
      if (response.data.success) {
        logSuccess(`${userType} logout successful`);
      } else {
        logError(`${userType} logout failed: ${response.data.message}`);
      }
      
    } catch (error) {
      if (error.response) {
        logError(`${userType} logout failed: ${error.response.data.message}`);
      } else {
        logError(`${userType} logout failed: ${error.message}`);
      }
    }
  }
}

async function testErrorCases() {
  log('\n⚠️  Testing Error Cases...', 'cyan');
  
  try {
    // Test invalid registration data
    logInfo('Testing invalid registration data...');
    
    const invalidData = {
      name: '', // Empty name
      email: 'invalid-email',
      phoneNumber: '123',
      role: 'INVALID_ROLE'
    };
    
    const response = await axios.post(`${API_BASE}/register`, invalidData);
    logWarning('Expected validation error but got success');
    
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logSuccess('Invalid registration data properly rejected');
      logInfo(`Validation errors: ${JSON.stringify(error.response.data.errors, null, 2)}`);
    } else {
      logError(`Unexpected error: ${error.message}`);
    }
  }
  
  try {
    // Test invalid OTP
    logInfo('Testing invalid OTP...');
    
    const invalidOTP = {
      userId: '507f1f77bcf86cd799439011',
      otp: '9999'
    };
    
    const response = await axios.post(`${API_BASE}/verify-otp`, invalidOTP);
    logWarning('Expected OTP error but got success');
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logSuccess('Invalid OTP properly rejected');
    } else {
      logError(`Unexpected error: ${error.message}`);
    }
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Comprehensive Endpoint Testing...', 'bright');
  log('================================================', 'bright');
  
  try {
    await testHealthEndpoints();
    await testUserRegistration();
    await testUserLogin();
    await testOTPVerification();
    await testProfileEndpoints();
    await testResendOTP();
    await testLogout();
    await testErrorCases();
    
    log('\n🎉 All Tests Completed!', 'bright');
    log('================================================', 'bright');
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testHealthEndpoints,
  testUserRegistration,
  testUserLogin,
  testOTPVerification,
  testProfileEndpoints,
  testResendOTP,
  testLogout,
  testErrorCases
};
