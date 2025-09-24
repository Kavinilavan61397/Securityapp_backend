const axios = require('axios');
const fs = require('fs');
const path = require('path');

const baseURL = 'https://securityapp-backend.vercel.app';

const testBase64Upload = async () => {
  console.log('🚀 Testing Base64 Photo Upload on Vercel...\n');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQzOTIyNjJkZTU2OTI5YmEyZDE4NTMiLCJlbWFpbCI6InRlc3R1c2VyMTc1ODY5NTk3Mjk0M0BleGFtcGxlLmNvbSIsInJvbGUiOiJSRVNJREVOVCIsImJ1aWxkaW5nSWQiOiI2OGIwNDA5OTk1MWNjMTk4NzNmYzNkZDMiLCJpYXQiOjE3NTg2OTYyMjgsImV4cCI6MTc1OTMwMTAyOH0.g9sQHKzWCTPnA4_PL38djafnH35n-tiDWZCqau0-Chg';
  
  try {
    // Create a small test image and convert to base64
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    // Create a minimal JPEG (1x1 pixel) - same as before
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
    
    // Convert to base64
    const base64Data = `data:image/jpeg;base64,${jpegData.toString('base64')}`;
    console.log('✅ Image converted to base64');
    console.log(`📏 Base64 length: ${base64Data.length} characters`);
    
    // Test profile access first
    console.log('\n1️⃣ Testing profile access...');
    const profileResponse = await axios.get(`${baseURL}/api/user-profile/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    if (profileResponse.data.success) {
      console.log('✅ Profile accessible');
      console.log('👤 User:', profileResponse.data.data.name);
    }
    
    // Test base64 upload
    console.log('\n2️⃣ Testing base64 photo upload...');
    const startTime = Date.now();
    
    const uploadResponse = await axios.post(
      `${baseURL}/api/user-profile/me/photo-base64`,
      {
        base64Data: base64Data,
        mimeType: 'image/jpeg',
        originalName: 'test-profile.jpg'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Base64 upload successful!');
    console.log(`⏱️ Upload time: ${duration}ms`);
    console.log('📸 Response:', JSON.stringify(uploadResponse.data, null, 2));
    
    // Test getting the photo back
    console.log('\n3️⃣ Testing photo retrieval...');
    const getPhotoResponse = await axios.get(`${baseURL}/api/user-profile/me/photo-base64`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    if (getPhotoResponse.data.success) {
      console.log('✅ Photo retrieval successful!');
      console.log('📸 Photo ID:', getPhotoResponse.data.data.photoId);
      console.log('📏 Photo size:', getPhotoResponse.data.data.size, 'bytes');
      console.log('🎨 MIME type:', getPhotoResponse.data.data.mimeType);
    }
    
    // Clean up
    fs.unlinkSync(testImagePath);
    console.log('\n🧹 Test image cleaned up');
    
    console.log('\n🎉 BASE64 UPLOAD WORKING ON VERCEL!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 POSTMAN SETUP:');
    console.log('POST https://securityapp-backend.vercel.app/api/user-profile/me/photo-base64');
    console.log('Headers: Authorization: Bearer ' + token);
    console.log('Body (JSON):');
    console.log('{');
    console.log('  "base64Data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",');
    console.log('  "mimeType": "image/jpeg",');
    console.log('  "originalName": "profile.jpg"');
    console.log('}');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Base64 upload failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('💡 Timeout error');
    } else if (error.response?.status === 500) {
      console.log('💡 Server error - check Vercel logs');
    }
  }
};

testBase64Upload();
