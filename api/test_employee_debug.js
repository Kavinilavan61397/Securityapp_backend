/**
 * DEBUG EMPLOYEE MANAGEMENT ENDPOINTS
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testEmployeeDebug = async () => {
  try {
    console.log('🔍 Debugging Employee Management endpoints...');
    
    // Step 1: Login
    const credentials = {
      email: 'buildingadmin@test.com',
      phoneNumber: '+919876543214',
      role: 'BUILDING_ADMIN'
    };
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      userId: loginResponse.data.data.userId,
      otp: '1234'
    });
    
    const token = verifyResponse.data.data.token;
    console.log('✅ Authentication successful');
    
    // Test Employee endpoints
    console.log('\n👥 TESTING EMPLOYEE MANAGEMENT ENDPOINTS...');
    
    const employeeEndpoints = [
      '/api/employees/categories',
      '/api/employees/generate-code',
      '/api/employees/68b04099951cc19873fc3dd3'
    ];
    
    for (const endpoint of employeeEndpoints) {
      try {
        console.log(`\n🧪 Testing ${endpoint}...`);
        
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ ${endpoint} works:`, response.data.success);
        if (response.data.data) {
          console.log(`   Data keys:`, Object.keys(response.data.data));
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint} failed:`, error.response?.status, error.response?.data?.message);
        console.log(`   Full error:`, JSON.stringify(error.response?.data, null, 2));
      }
    }
    
    // Test Employee creation
    console.log('\n🧪 Testing Employee Creation...');
    try {
      const employeeData = {
        name: 'Test Employee',
        phoneNumber: '+919876543300',
        joiningDate: '2024-01-15',
        employeeType: 'SECURITY_GUARD',
        canLogin: false
      };
      
      const response = await axios.post(`${BASE_URL}/api/employees/68b04099951cc19873fc3dd3`, employeeData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Employee creation works:`, response.data.success);
      
    } catch (error) {
      console.log(`❌ Employee creation failed:`, error.response?.status, error.response?.data?.message);
      console.log(`   Full error:`, JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testEmployeeDebug();
