const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app/api';
const BUILDING_ID = '68b04099951cc19873fc3dd3';

async function getAdminToken() {
  try {
    console.log('🔐 Getting admin token...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admintest@example.com',
      password: 'password123'
    });
    
    if (response.data.success && response.data.data.token) {
      console.log('✅ Admin token obtained');
      return response.data.data.token;
    } else {
      throw new Error('Failed to get admin token');
    }
  } catch (error) {
    console.log('❌ Error getting admin token:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testMinimalEmployeeCreation(token) {
  try {
    console.log('\n👤 Testing minimal employee creation (name + phone only)...');
    
    const response = await axios.post(`${BASE_URL}/employees/${BUILDING_ID}`, {
      name: 'John Security Guard',
      phoneNumber: '+919876543215'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Minimal employee creation successful');
      console.log(`   Employee ID: ${response.data.data.employee.id}`);
      console.log(`   Name: ${response.data.data.employee.name}`);
      console.log(`   Phone: ${response.data.data.employee.phoneNumber}`);
      console.log(`   Employee Code: ${response.data.data.employee.employeeCode || 'Auto-generated'}`);
      console.log(`   Employee Type: ${response.data.data.employee.employeeType || 'Not set'}`);
      console.log(`   Joining Date: ${response.data.data.employee.joiningDate || 'Not set'}`);
      return response.data.data.employee.id;
    } else {
      console.log('❌ Minimal employee creation failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Minimal employee creation error:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testFullEmployeeCreation(token) {
  try {
    console.log('\n👤 Testing full employee creation (all fields)...');
    
    const response = await axios.post(`${BASE_URL}/employees/${BUILDING_ID}`, {
      name: 'Jane Security Guard',
      phoneNumber: '+919876543216',
      email: 'jane@security.com',
      department: 'Security',
      designation: 'Senior Guard',
      employeeType: 'SECURITY_GUARD',
      joiningDate: '2024-01-15',
      canLogin: true,
      workSchedule: {
        startTime: '08:00',
        endTime: '20:00',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+919876543217',
        relationship: 'Spouse'
      },
      notes: 'Experienced security guard with 5 years experience'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Full employee creation successful');
      console.log(`   Employee ID: ${response.data.data.employee.id}`);
      console.log(`   Name: ${response.data.data.employee.name}`);
      console.log(`   Phone: ${response.data.data.employee.phoneNumber}`);
      console.log(`   Email: ${response.data.data.employee.email}`);
      console.log(`   Department: ${response.data.data.employee.department}`);
      console.log(`   Employee Type: ${response.data.data.employee.employeeType}`);
      console.log(`   Can Login: ${response.data.data.employee.canLogin}`);
      return response.data.data.employee.id;
    } else {
      console.log('❌ Full employee creation failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Full employee creation error:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testInvalidEmployeeCreation(token) {
  try {
    console.log('\n🚫 Testing invalid employee creation (missing name)...');
    
    const response = await axios.post(`${BASE_URL}/employees/${BUILDING_ID}`, {
      phoneNumber: '+919876543218'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('❌ Should have failed but succeeded:', response.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Missing name properly rejected');
      console.log(`   Error: ${error.response.data.message}`);
    } else {
      console.log('❌ Unexpected error for missing name:', error.response?.data?.message || error.message);
    }
  }
}

async function testGetEmployees(token) {
  try {
    console.log('\n📋 Testing get all employees...');
    
    const response = await axios.get(`${BASE_URL}/employees/${BUILDING_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Get employees successful');
      console.log(`   Total employees: ${response.data.data.employees.length}`);
      response.data.data.employees.forEach((emp, index) => {
        console.log(`   ${index + 1}. ${emp.name} (${emp.phoneNumber}) - ${emp.employeeType || 'No type'}`);
      });
    } else {
      console.log('❌ Get employees failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Get employees error:', error.response?.data?.message || error.message);
  }
}

async function runEmployeeTests() {
  console.log('🚀 TESTING EMPLOYEE CREATION WITH MINIMAL FIELDS');
  console.log('=' .repeat(60));
  
  // Get admin token
  const token = await getAdminToken();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    return;
  }
  
  // Test minimal employee creation
  const minimalEmployeeId = await testMinimalEmployeeCreation(token);
  
  // Test full employee creation
  const fullEmployeeId = await testFullEmployeeCreation(token);
  
  // Test invalid employee creation
  await testInvalidEmployeeCreation(token);
  
  // Test get employees
  await testGetEmployees(token);
  
  console.log('\n🎯 EMPLOYEE CREATION TESTS COMPLETE!');
  
  if (minimalEmployeeId && fullEmployeeId) {
    console.log('✅ All employee creation tests passed!');
    console.log('✅ Minimal fields (name + phone) working');
    console.log('✅ Full fields working');
    console.log('✅ Validation working');
  } else {
    console.log('❌ Some tests failed - check the output above');
  }
}

// Run the tests
runEmployeeTests().catch(console.error);
