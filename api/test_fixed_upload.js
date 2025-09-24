const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const baseURL = 'https://securityapp-backend.vercel.app';

const testFixedUpload = async () => {
  console.log('🚀 Testing Fixed File Upload (Memory Storage)...\n');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQzOTIyNjJkZTU2OTI5YmEyZDE4NTMiLCJlbWFpbCI6InRlc3R1c2VyMTc1ODY5NTk3Mjk0M0BleGFtcGxlLmNvbSIsInJvbGUiOiJSRVNJREVOVCIsImJ1aWxkaW5nSWQiOiI2OGIwNDA5OTk1MWNjMTk4NzNmYzNkZDMiLCJpYXQiOjE3NTg2OTYyMjgsImV4cCI6MTc1OTMwMTAyOH0.g9sQHKzWCTPnA4_PL38djafnH35n-tiDWZCqau0-Chg';
  
  try {
    // Create a small test image
    const testImagePath = path.join(__dirname, 'test-small.jpg');
    
    // Create a minimal JPEG (1x1 pixel)
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
    
    // Create form data
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-profile.jpg',
      contentType: 'image/jpeg'
    });
    
    console.log('📤 Uploading photo with memory storage...');
    const startTime = Date.now();
    
    const response = await axios.post(
      `${baseURL}/api/user-profile/me/photo`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        timeout: 15000
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Upload successful!');
    console.log(`⏱️ Upload time: ${duration}ms`);
    console.log('📸 Response:', JSON.stringify(response.data, null, 2));
    
    // Test getting the photo back
    console.log('\n3️⃣ Testing photo retrieval...');
    const getPhotoResponse = await axios.get(`${baseURL}/api/user-profile/me/photo`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000,
      responseType: 'arraybuffer'
    });
    
    if (getPhotoResponse.status === 200) {
      console.log('✅ Photo retrieval successful!');
      console.log('📏 Photo size:', getPhotoResponse.data.length, 'bytes');
      console.log('🎨 Content-Type:', getPhotoResponse.headers['content-type']);
    }
    
    // Clean up
    fs.unlinkSync(testImagePath);
    console.log('\n🧹 Test image cleaned up');
    
    console.log('\n🎉 FIXED UPLOAD WORKING ON VERCEL!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 NOW USE IN POSTMAN:');
    console.log('POST https://securityapp-backend.vercel.app/api/user-profile/me/photo');
    console.log('Headers: Authorization: Bearer ' + token);
    console.log('Body: form-data with photo key and your image file');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('💡 Timeout error');
    } else if (error.response?.status === 500) {
      console.log('💡 Server error - check Vercel logs');
    }
  }
};

testFixedUpload();
