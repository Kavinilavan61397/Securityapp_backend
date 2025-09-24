const axios = require('axios');

const baseURL = 'https://securityapp-backend.vercel.app';

const testProfileWithPhoto = async () => {
  console.log('🚀 Testing Profile with Photo Data...\n');
  
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQzOTIyNjJkZTU2OTI5YmEyZDE4NTMiLCJlbWFpbCI6InRlc3R1c2VyMTc1ODY5NTk3Mjk0M0BleGFtcGxlLmNvbSIsInJvbGUiOiJSRVNJREVOVCIsImJ1aWxkaW5nSWQiOiI2OGIwNDA5OTk1MWNjMTk4NzNmYzNkZDMiLCJpYXQiOjE3NTg2OTYyMjgsImV4cCI6MTc1OTMwMTAyOH0.g9sQHKzWCTPnA4_PL38djafnH35n-tiDWZCqau0-Chg';
  
  try {
    console.log('1️⃣ Testing GET profile with photo data...');
    
    const response = await axios.get(`${baseURL}/api/user-profile/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    if (response.data.success) {
      const user = response.data.data;
      console.log('✅ Profile loaded successfully');
      console.log('👤 Name:', user.name);
      console.log('📧 Email:', user.email);
      console.log('🏢 Building ID:', user.buildingId);
      
      if (user.profilePhotoData) {
        console.log('\n📸 PHOTO DATA INCLUDED:');
        console.log('🆔 Photo ID:', user.profilePhotoData.photoId);
        console.log('📏 Photo Size:', user.profilePhotoData.size, 'bytes');
        console.log('🎨 MIME Type:', user.profilePhotoData.mimeType);
        console.log('💾 Storage Type:', user.profilePhotoData.storageType);
        console.log('📝 Original Name:', user.profilePhotoData.originalName);
        console.log('🔗 Base64 Data Length:', user.profilePhotoData.base64Data ? user.profilePhotoData.base64Data.length : 'No data');
        
        if (user.profilePhotoData.base64Data) {
          console.log('\n🎉 SUCCESS! Photo data is included in profile response!');
          console.log('📱 UI can now display the photo directly from profile data');
        }
      } else {
        console.log('\n❌ No photo data found in profile response');
      }
      
      console.log('\n📋 FRONTEND USAGE:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('// Load profile with photo data');
      console.log('const profile = await fetch("/api/user-profile/me");');
      console.log('const user = profile.data;');
      console.log('');
      console.log('// Display photo directly');
      console.log('if (user.profilePhotoData) {');
      console.log('  const img = document.createElement("img");');
      console.log('  img.src = user.profilePhotoData.base64Data;');
      console.log('  document.body.appendChild(img);');
      console.log('}');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
    } else {
      console.log('❌ Profile load failed:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
};

testProfileWithPhoto();
