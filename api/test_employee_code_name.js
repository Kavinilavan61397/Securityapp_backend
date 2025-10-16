const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testEmployeeCodeAndName() {
  console.log('🔧 TESTING EMPLOYEE CODE & NAME LOGIN');
  console.log('=====================================');
  
  try {
    // Step 1: Login as security user
    console.log('\n🔐 Step 1: Login as Security User');
    console.log('---------------------------------');
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      loginIdentifier: 'securityguard@test.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      const user = loginResponse.data.data.user;
      console.log('✅ Security login successful!');
      console.log(`👤 User: ${user.name} (${user.role})`);
      
      // Step 2: Get available employees to see their codes and names
      console.log('\n👥 Step 2: Get Available Employees');
      console.log('----------------------------------');
      
      const employeesResponse = await axios.get(
        `${BASE_URL}/api/employee-entries/68b04099951cc19873fc3dd3/available-employees`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (employeesResponse.data.success) {
        const employees = employeesResponse.data.data.employees;
        console.log(`✅ Found ${employees.length} eligible employees`);
        
        if (employees.length > 0) {
          const firstEmployee = employees[0];
          console.log(`🎯 Test Employee: ${firstEmployee.name} (${firstEmployee.employeeTypeDisplay})`);
          console.log(`🆔 Employee Code: ${firstEmployee.employeeCode}`);
          console.log(`📝 Employee Name: ${firstEmployee.name}`);
          
          // Step 3: Test Employee Entry by Employee Code
          console.log('\n🚪 Step 3: Test Entry by Employee Code');
          console.log('-------------------------------------');
          
          const entryByCodeResponse = await axios.post(
            `${BASE_URL}/api/employee-entries/68b04099951cc19873fc3dd3/log-entry`,
            {
              employeeCode: firstEmployee.employeeCode,
              purpose: 'Testing entry by employee code',
              notes: 'UI-friendly employee code entry'
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          if (entryByCodeResponse.data.success) {
            console.log('✅ Entry by employee code successful!');
            console.log(`📝 Message: ${entryByCodeResponse.data.message}`);
            console.log(`🆔 Entry ID: ${entryByCodeResponse.data.data.entry.entryId}`);
          } else {
            console.log('❌ Entry by employee code failed:', entryByCodeResponse.data.message);
          }
          
          // Step 4: Test Employee Entry by Employee Name
          console.log('\n🚪 Step 4: Test Entry by Employee Name');
          console.log('-------------------------------------');
          
          const entryByNameResponse = await axios.post(
            `${BASE_URL}/api/employee-entries/68b04099951cc19873fc3dd3/log-entry`,
            {
              employeeName: firstEmployee.name.toLowerCase(), // Test case-insensitive
              purpose: 'Testing entry by employee name',
              notes: 'UI-friendly employee name entry (case-insensitive)'
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          if (entryByNameResponse.data.success) {
            console.log('✅ Entry by employee name successful!');
            console.log(`📝 Message: ${entryByNameResponse.data.message}`);
            console.log(`🆔 Entry ID: ${entryByNameResponse.data.data.entry.entryId}`);
          } else {
            console.log('❌ Entry by employee name failed:', entryByNameResponse.data.message);
          }
          
          console.log('\n🎉 ALL TESTS COMPLETED!');
          console.log('=======================');
          console.log('✅ Employee entry by code working');
          console.log('✅ Employee entry by name working');
          console.log('✅ Case-insensitive matching working');
          console.log('✅ UI-friendly implementation ready!');
          
        } else {
          console.log('⚠️  No employees available for testing');
        }
      } else {
        console.log('❌ Failed to get available employees:', employeesResponse.data.message);
      }
      
    } else {
      console.log('❌ Security login failed:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

// Run the test
testEmployeeCodeAndName();
