/**
 * QUICK ADMIN FLOW STATUS CHECK
 */

const axios = require('axios');

const BASE_URL = 'https://securityapp-backend.vercel.app';

const testAdminStatus = async () => {
  try {
    console.log('🔍 Quick Admin Flow Status Check...');
    
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
    
    // Test all Admin Flow endpoints quickly
    const endpoints = [
      // Employee Management
      { name: 'Employee Categories', url: '/api/employees/categories', method: 'GET' },
      { name: 'Generate Employee Code', url: '/api/employees/generate-code', method: 'GET' },
      { name: 'Get All Employees', url: '/api/employees/68b04099951cc19873fc3dd3', method: 'GET' },
      
      // Admin Dashboard
      { name: 'Admin Dashboard', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3', method: 'GET' },
      { name: 'Today Visits', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/today-visits', method: 'GET' },
      { name: 'Recent Activity', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/recent-activity', method: 'GET' },
      { name: 'Quick Actions', url: '/api/admin-dashboard/68b04099951cc19873fc3dd3/quick-actions', method: 'GET' },
      
      // Message System
      { name: 'Get All Messages', url: '/api/messages/68b04099951cc19873fc3dd3', method: 'GET' },
      { name: 'Previous Posts', url: '/api/messages/68b04099951cc19873fc3dd3/previous-posts', method: 'GET' },
      
      // Resident Approval
      { name: 'Get All Approvals', url: '/api/resident-approvals/68b04099951cc19873fc3dd3', method: 'GET' },
      { name: 'Pending Count', url: '/api/resident-approvals/68b04099951cc19873fc3dd3/pending/count', method: 'GET' },
      { name: 'Approval Stats', url: '/api/resident-approvals/68b04099951cc19873fc3dd3/stats', method: 'GET' }
    ];
    
    console.log('\n📊 TESTING ALL ADMIN FLOW ENDPOINTS...');
    console.log('=' .repeat(60));
    
    let working = 0;
    let failing = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios({
          method: endpoint.method,
          url: `${BASE_URL}${endpoint.url}`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ ${endpoint.name}: WORKING`);
        working++;
        
      } catch (error) {
        const status = error.response?.status || 'No response';
        const message = error.response?.data?.message || error.message;
        console.log(`❌ ${endpoint.name}: FAILED (${status}) - ${message}`);
        failing++;
      }
    }
    
    console.log('\n🎉 ADMIN FLOW STATUS SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`✅ Working: ${working}`);
    console.log(`❌ Failing: ${failing}`);
    console.log(`📊 Success Rate: ${((working / (working + failing)) * 100).toFixed(1)}%`);
    
    if (failing === 0) {
      console.log('\n🎉 ALL ADMIN FLOW ENDPOINTS ARE WORKING!');
    } else {
      console.log(`\n⚠️  ${failing} endpoint(s) still need fixing.`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

testAdminStatus();
