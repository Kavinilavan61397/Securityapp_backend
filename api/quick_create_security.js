const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function createSecurityUser() {
  console.log('🔐 CREATING NEW SECURITY USER');
  console.log('==============================');
  
  try {
    const userData = {
      name: 'Security Guard Test',
      email: 'securityguard@test.com',
      phoneNumber: '+919876543999',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'SECURITY',
      buildingId: '68b04099951cc19873fc3dd3',
      employeeCode: 'SEC999'
    };
    
    console.log('📝 Creating security user...');
    const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
    
    if (response.data.success) {
      console.log('✅ Security user created!');
      console.log('📧 Email: securityguard@test.com');
      console.log('🔑 Password: password123');
      
      // Test login
      console.log('\n🔐 Testing login...');
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        loginIdentifier: 'securityguard@test.com',
        password: 'password123'
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Login successful!');
        console.log(`Role: ${loginResponse.data.data.user.role}`);
        
        console.log('\n🎯 USE IN POSTMAN:');
        console.log('==================');
        console.log('LoginIdentifier: securityguard@test.com');
        console.log('Password: password123');
      }
    }
    
  } catch (error) {
    if (error.response?.data?.message?.includes('already exists')) {
      console.log('✅ User already exists! Testing login...');
      
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        loginIdentifier: 'securityguard@test.com',
        password: 'password123'
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Login successful!');
        console.log('\n🎯 USE IN POSTMAN:');
        console.log('==================');
        console.log('LoginIdentifier: securityguard@test.com');
        console.log('Password: password123');
      }
    } else {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }
  }
}

createSecurityUser();
