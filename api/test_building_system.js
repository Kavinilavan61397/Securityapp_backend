const axios = require('axios');

/**
 * Building System Testing Script
 * Tests all building endpoints and user registration flow
 * 100% Dynamic - NO hardcoded values
 */

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test data - 100% dynamic
const testData = {
  // Super Admin for building creation
  superAdmin: {
    name: 'Super Admin',
    email: 'superadmin@test.com',
    phoneNumber: '+919876543210',
    role: 'SUPER_ADMIN'
  },
  
  // Building data
  building: {
    name: 'Sunrise Apartments',
    address: {
      street: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    },
    totalFloors: 15,
    totalFlats: 120,
    contactPhone: '+919876543211',
    contactEmail: 'admin@sunriseapartments.com',
    features: ['Gym', 'Swimming Pool', 'Garden', 'Security'],
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
  },
  
  // Test users for different roles
  users: {
    buildingAdmin: {
      name: 'Building Admin',
      email: 'buildingadmin@test.com',
      phoneNumber: '+919876543212',
      role: 'BUILDING_ADMIN',
      employeeCode: 'EMP001'
    },
    security: {
      name: 'Security Guard',
      email: 'security@test.com',
      phoneNumber: '+919876543213',
      role: 'SECURITY',
      employeeCode: 'SEC001'
    },
    resident: {
      name: 'John Resident',
      email: 'resident@test.com',
      phoneNumber: '+919876543214',
      role: 'RESIDENT',
      flatNumber: 'A-101',
      tenantType: 'OWNER'
    }
  }
};

// Helper functions
const log = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  info: (msg) => console.log(`ℹ️  ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  step: (msg) => console.log(`\n🔹 ${msg}`)
};

let superAdminToken = null;
let buildingId = null;

// Test functions
async function testHealthEndpoints() {
  log.step('Testing Health Endpoints');
  
  try {
    // Test server health
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    log.success(`Server Health: ${healthResponse.status} - ${healthResponse.data.message}`);
    
    // Test database health
    const dbHealthResponse = await axios.get(`${BASE_URL}/db-health`);
    log.success(`Database Health: ${dbHealthResponse.status} - Database connected`);
    
    // Test API info
    const apiResponse = await axios.get(`${API_BASE}`);
    log.success(`API Info: ${apiResponse.status} - ${apiResponse.data.message}`);
    
  } catch (error) {
    log.error(`Health endpoints failed: ${error.message}`);
    throw error;
  }
}

async function createSuperAdmin() {
  log.step('Creating Super Admin User');
  
  try {
    // First try to login if user exists
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: testData.superAdmin.email,
        phoneNumber: testData.superAdmin.phoneNumber
      });
      
      log.info(`Super Admin Login: ${loginResponse.status} - User already exists`);
      
      // Get OTP and userId from response (development mode)
      const otpCode = loginResponse.data.data.otpCode;
      const userId = loginResponse.data.data.userId;
      log.info(`OTP Code: ${otpCode}`);
      log.info(`User ID: ${userId}`);
      
      // Verify OTP and get token
      const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
        userId: userId,
        otp: otpCode
      });
      
      superAdminToken = verifyResponse.data.data.token;
      log.success(`Super Admin Login: ${verifyResponse.status} - Token received`);
      return; // Exit early if login successful
      
    } catch (loginError) {
      // If login fails, register new user
      log.info('User does not exist, creating new Super Admin...');
      
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, testData.superAdmin);
      log.success(`Super Admin Registration: ${registerResponse.status}`);
      
      // Get OTP and userId from response (development mode)
      const otpCode = registerResponse.data.data.otpCode;
      const userId = registerResponse.data.data.userId;
      log.info(`OTP Code: ${otpCode}`);
      log.info(`User ID: ${userId}`);
      
      // Verify OTP and get token
      const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
        userId: userId,
        otp: otpCode
      });
      
      superAdminToken = verifyResponse.data.data.token;
      log.success(`Super Admin Login: ${verifyResponse.status} - Token received`);
    }
    
  } catch (error) {
    log.error(`Super Admin creation failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function testBuildingCreation() {
  log.step('Testing Building Creation');
  
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
    log.info(`Building Address: ${response.data.data.address}`);
    
  } catch (error) {
    log.error(`Building creation failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function testBuildingEndpoints() {
  log.step('Testing Building Endpoints');
  
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
    const searchResponse = await axios.get(`${API_BASE}/buildings/search?query=Sunrise`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    log.success(`Building Search: ${searchResponse.status} - Results: ${searchResponse.data.data.buildings.length}`);
    
  } catch (error) {
    log.error(`Building endpoints failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function testUserRegistrationWithBuilding() {
  log.step('Testing User Registration with Building ID');
  
  try {
    // Test Building Admin registration
    const buildingAdminData = { ...testData.users.buildingAdmin, buildingId };
    const buildingAdminResponse = await axios.post(`${API_BASE}/auth/register`, buildingAdminData);
    log.success(`Building Admin Registration: ${buildingAdminResponse.status}`);
    
    // Test Security registration
    const securityData = { ...testData.users.security, buildingId };
    const securityResponse = await axios.post(`${API_BASE}/auth/register`, securityData);
    log.success(`Security Registration: ${securityResponse.status}`);
    
    // Test Resident registration
    const residentData = { ...testData.users.resident, buildingId };
    const residentResponse = await axios.post(`${API_BASE}/auth/register`, residentData);
    log.success(`Resident Registration: ${residentResponse.status}`);
    
  } catch (error) {
    log.error(`User registration with building failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function testBuildingUpdate() {
  log.step('Testing Building Update');
  
  try {
    const updateData = {
      totalFloors: 16,
      features: ['Gym', 'Swimming Pool', 'Garden', 'Security', 'Parking']
    };
    
    const response = await axios.put(`${API_BASE}/buildings/${buildingId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    log.success(`Building Updated: ${response.status}`);
    log.info(`Updated Floors: ${response.data.data.totalFloors}`);
    log.info(`Updated Features: ${response.data.data.features.join(', ')}`);
    
  } catch (error) {
    log.error(`Building update failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function runAllTests() {
  log.info('🚀 Starting Building System Tests');
  log.info('================================');
  
  try {
    await testHealthEndpoints();
    await createSuperAdmin();
    await testBuildingCreation();
    await testBuildingEndpoints();
    await testUserRegistrationWithBuilding();
    await testBuildingUpdate();
    
    log.info('\n🎉 All Building System Tests Completed Successfully!');
    log.info('================================');
    log.success(`🏢 Building ID: ${buildingId}`);
    log.success(`🔐 Super Admin Token: ${superAdminToken ? 'Received' : 'Failed'}`);
    log.info('✅ Ready for Postman testing!');
    
  } catch (error) {
    log.error('\n💥 Building System Tests Failed!');
    log.error('================================');
    log.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runAllTests();
