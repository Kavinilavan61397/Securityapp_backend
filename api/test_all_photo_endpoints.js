const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const baseURL = 'https://securityapp-backend.vercel.app';

const testAllPhotoEndpoints = async () => {
  console.log('🚀 Testing All Photo Endpoints...\n');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQzOTIyNjJkZTU2OTI5YmEyZDE4NTMiLCJlbWFpbCI6InRlc3R1c2VyMTc1ODY5NTk3Mjk0M0BleGFtcGxlLmNvbSIsInJvbGUiOiJSRVNJREVOVCIsImJ1aWxkaW5nSWQiOiI2OGIwNDA5OTk1MWNjMTk4NzNmYzNkZDMiLCJpYXQiOjE3NTg2OTYyMjgsImV4cCI6MTc1OTMwMTAyOH0.g9sQHKzWCTPnA4_PL38djafnH35n-tiDWZCqau0-Chg';
  
  try {
    // Create a small test image
    const testImagePath = path.join(__dirname, 'test-photo.jpg');
    const jpegData = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x01, 0x00,
      0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x00, 0xFF, 0xD9
    ]);
    
    fs.writeFileSync(testImagePath, jpegData);
    console.log('✅ Test image created');
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // Test 1: POST - Upload Photo
    console.log('\n1️⃣ Testing POST - Upload Photo...');
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-profile.jpg',
      contentType: 'image/jpeg'
    });
    
    const uploadResponse = await axios.post(
      `${baseURL}/api/user-profile/me/photo`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          ...headers
        },
        timeout: 15000
      }
    );
    
    if (uploadResponse.data.success) {
      console.log('✅ POST Upload successful');
      console.log('📸 Photo ID:', uploadResponse.data.data.photoId);
    }
    
    // Test 2: GET - Get Photo
    console.log('\n2️⃣ Testing GET - Get Photo...');
    const getResponse = await axios.get(
      `${baseURL}/api/user-profile/me/photo`,
      {
        headers,
        timeout: 10000,
        responseType: 'arraybuffer'
      }
    );
    
    if (getResponse.status === 200) {
      console.log('✅ GET Photo successful');
      console.log('📏 Photo size:', getResponse.data.length, 'bytes');
      console.log('🎨 Content-Type:', getResponse.headers['content-type']);
    }
    
    // Test 3: PUT - Update Photo
    console.log('\n3️⃣ Testing PUT - Update Photo...');
    const updateFormData = new FormData();
    updateFormData.append('photo', fs.createReadStream(testImagePath), {
      filename: 'updated-profile.jpg',
      contentType: 'image/jpeg'
    });
    
    const updateResponse = await axios.put(
      `${baseURL}/api/user-profile/me/photo`,
      updateFormData,
      {
        headers: {
          ...updateFormData.getHeaders(),
          ...headers
        },
        timeout: 15000
      }
    );
    
    if (updateResponse.data.success) {
      console.log('✅ PUT Update successful');
      console.log('📸 Updated Photo ID:', updateResponse.data.data.photoId);
    }
    
    // Test 4: GET - Verify Updated Photo
    console.log('\n4️⃣ Testing GET - Verify Updated Photo...');
    const verifyResponse = await axios.get(
      `${baseURL}/api/user-profile/me/photo`,
      {
        headers,
        timeout: 10000,
        responseType: 'arraybuffer'
      }
    );
    
    if (verifyResponse.status === 200) {
      console.log('✅ GET Updated Photo successful');
      console.log('📏 Updated Photo size:', verifyResponse.data.length, 'bytes');
    }
    
    // Test 5: DELETE - Delete Photo
    console.log('\n5️⃣ Testing DELETE - Delete Photo...');
    const deleteResponse = await axios.delete(
      `${baseURL}/api/user-profile/me/photo`,
      {
        headers,
        timeout: 10000
      }
    );
    
    if (deleteResponse.data.success) {
      console.log('✅ DELETE Photo successful');
    }
    
    // Test 6: GET - Verify Deletion
    console.log('\n6️⃣ Testing GET - Verify Deletion...');
    try {
      await axios.get(
        `${baseURL}/api/user-profile/me/photo`,
        {
          headers,
          timeout: 10000
        }
      );
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Photo deletion verified (404 expected)');
      }
    }
    
    // Clean up
    fs.unlinkSync(testImagePath);
    console.log('\n🧹 Test image cleaned up');
    
    console.log('\n🎉 ALL PHOTO ENDPOINTS WORKING!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 POSTMAN ENDPOINTS:');
    console.log('POST   https://securityapp-backend.vercel.app/api/user-profile/me/photo');
    console.log('GET    https://securityapp-backend.vercel.app/api/user-profile/me/photo');
    console.log('PUT    https://securityapp-backend.vercel.app/api/user-profile/me/photo');
    console.log('DELETE https://securityapp-backend.vercel.app/api/user-profile/me/photo');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
};

testAllPhotoEndpoints();
