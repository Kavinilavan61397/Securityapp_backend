require("dotenv").config();

const axios = require('axios');

/**
 * Super Admin Testing Script
 * Tests all Super Admin capabilities systematically
 */

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const API_BASE = `${BASE_URL}/api`;

// Test data
const testData = {
  superAdmin: {
    name: 'Test Super Admin',
    email: 'testsuper@test.com',
    phoneNumber: '+919876543210',
    role: 'SUPER_ADMIN'
  },
  
  building: {
    name: 'Test Building for Super Admin',
    address: {
      street: '456 Super Admin Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400002'
    },
    contactPhone: '+919876543220',
    contactEmail: 'superadmin@testbuilding.com'
  },
  
  testUser: {
    name: 'Test User',
    email: 'testuser@test.com',
    phoneNumber: '+919876543221',
    role: 'RESIDENT',
    flatNumber: 'B-202',
    tenantType: 'TENANT'
  }
};

// Helper functions
const log = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  info: (msg) => console.log(`ℹ️  ${msg}`),
  step: (msg) => console.log(`\n🔹 ${msg}`)
};

let superAdminToken = null;
let buildingId = null;
let testUserId = null;

// Test functions
async function testSuperAdminRegistration() {
  log.step('Testing Super Admin Registration');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/register`, testData.superAdmin);
    log.success(`Super Admin Registration: ${response.status}`);
    
    const { userId, otpCode } = response.data.data;
    log.info(`User ID: ${userId}`);
    log.info(`OTP Code: ${otpCode}`);
    
    // Verify OTP to get token
    const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
      userId: userId,
      otp: otpCode
    });
    
    superAdminToken = verifyResponse.data.data.token;
    log.success(`Super Admin Login: ${verifyResponse.status} - Token received`);
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      log.info('Super Admin already exists, proceeding to login...');
      await testSuperAdminLogin();
    } else {
      log.error(`Super Admin registration failed: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }
}

async function testSuperAdminLogin() {
  log.step('Testing Super Admin Login');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: testData.superAdmin.email,
      phoneNumber: testData.superAdmin.phoneNumber
    });
    
    log.success(`Super Admin Login: ${response.status}`);
    
    const { userId, otpCode } = response.data.data;
    log.info(`User ID: ${userId}`);
    log.info(`OTP Code: ${otpCode}`);
    
    // Verify OTP to get token
    const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
      userId: userId,
      otp: otpCode
    });
    
    superAdminToken = verifyResponse.data.data.token;
    log.success(`Super Admin Login: ${verifyResponse.status} - Token received`);
    
  } catch (error) {
    log.error(`Super Admin login failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function testSuperAdminBuildingCreation() {
  log.step('Testing Super Admin Building Creation');
  
  try {
    const response = await axios.post(`${API_BASE}/buildings`, testData.building, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    buildingId = response.data.data.buildingId;
    log.success(`Building Created: ${response.status} - ID: ${buildingId}`);
    log.info(`Building Name: ${response.data.data.name}`);
    
  } catch (error) {
    log.error(`Building creation failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function testSuperAdminBuildingManagement() {
  log.step('Testing Super Admin Building Management');
  
  try {
    // Test get all buildings
    const getAllResponse = await axios.get(`${API_BASE}/buildings`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    log.success(`Get All Buildings: ${getAllResponse.status} - Count: ${getAllResponse.data.data.buildings.length}`);
    
    // Test get building by ID
    const getByIdResponse = await axios.get(`${API_BASE}/buildings/${buildingId}`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    log.success(`Get Building by ID: ${getByIdResponse.status} - Name: ${getByIdResponse.data.data.name}`);
    
    // Test get building stats
    const statsResponse = await axios.get(`${API_BASE}/buildings/${buildingId}/stats`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    log.success(`Building Stats: ${statsResponse.status} - Total Users: ${statsResponse.data.data.occupancy.total}`);
    
    // Test search buildings
    const searchResponse = await axios.get(`${API_BASE}/buildings/search?query=Test`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    log.success(`Building Search: ${searchResponse.status} - Results: ${searchResponse.data.data.buildings.length}`);
    
  } catch (error) {
    log.error(`Building management failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function testSuperAdminUserManagement() {
  log.step('Testing Super Admin User Management');
  
  try {
    // Test user registration with building
    const userData = { ...testData.testUser, buildingId };
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, userData);
    log.success(`User Registration: ${registerResponse.status}`);
    
    testUserId = registerResponse.data.data.userId;
    log.info(`Test User ID: ${testUserId}`);
    
  } catch (error) {
    log.error(`User management failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function testSuperAdminAccessControl() {
  log.step('Testing Super Admin Access Control');
  
  try {
    // Test that Super Admin can access all buildings
    const allBuildingsResponse = await axios.get(`${API_BASE}/buildings`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    
    log.success(`Super Admin can access all buildings: ${allBuildingsResponse.status}`);
    log.info(`Total buildings accessible: ${allBuildingsResponse.data.data.buildings.length}`);
    
    // Test building update permissions
    const updateData = {
      totalFloors: 20,
      features: ['Gym', 'Swimming Pool', 'Garden', 'Security', 'Parking', 'Super Admin Access']
    };
    
    const updateResponse = await axios.put(`${API_BASE}/buildings/${buildingId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    log.success(`Building Update: ${updateResponse.status}`);
    log.info(`Updated Floors: ${updateResponse.data.data.totalFloors}`);
    
  } catch (error) {
    log.error(`Access control test failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function testSuperAdminProfile() {
  log.step('Testing Super Admin Profile');
  
  try {
    // Test get profile
    const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    
    log.success(`Get Profile: ${profileResponse.status}`);
    log.info(`Role: ${profileResponse.data.data.user.role}`);
    log.info(`Name: ${profileResponse.data.data.user.name}`);
    
    // Test update profile
    const updateData = {
      name: 'Updated Super Admin',
      age: 35,
      gender: 'MALE'
    };
    
    const updateResponse = await axios.put(`${API_BASE}/auth/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    log.success(`Update Profile: ${updateResponse.status}`);
    
  } catch (error) {
    log.error(`Profile test failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function runAllSuperAdminTests() {
  log.info('🚀 Starting Super Admin System Tests');
  log.info('====================================');
  
  try {
    await testSuperAdminRegistration();
    await testSuperAdminBuildingCreation();
    await testSuperAdminBuildingManagement();
    await testSuperAdminUserManagement();
    await testSuperAdminAccessControl();
    await testSuperAdminProfile();
    
    log.info('\n🎉 All Super Admin Tests Completed Successfully!');
    log.info('================================================');
    log.success(`🏢 Building ID: ${buildingId}`);
    log.success(`👤 Test User ID: ${testUserId}`);
    log.success(`🔐 Super Admin Token: ${superAdminToken ? 'Received' : 'Failed'}`);
    log.info('✅ Super Admin system is fully functional!');
    
  } catch (error) {
    log.error('\n💥 Super Admin Tests Failed!');
    log.error('================================');
    log.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runAllSuperAdminTests();
