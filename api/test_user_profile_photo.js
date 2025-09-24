const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const TEST_BUILDING_ID = '68b04099951cc19873fc3dd3'; // Use existing building ID

// Test data
let testData = {
  residentToken: null,
  buildingId: TEST_BUILDING_ID,
  userId: null
};

// Helper function for API requests
const apiRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    console.error(`API Request Error (${method} ${endpoint}):`, error.response?.data || error.message);
    throw error;
  }
};

// Create a test image
const createTestImage = () => {
  const testImagePath = path.join(__dirname, 'test-profile-image.jpg');
  
  // Create a simple 1x1 pixel JPEG (minimal valid image)
  const jpegData = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
    0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
    0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x00, 0xFF, 0xD9
  ]);
  
  fs.writeFileSync(testImagePath, jpegData);
  return testImagePath;
};

// Test 1: Get Resident Token
const getResidentToken = async () => {
  console.log('🔐 Getting resident token...');
  
  try {
    const response = await apiRequest('POST', '/api/auth/login', {
      username: 'resident1',
      password: 'SecurePass123!'
    });
    
    testData.residentToken = response.data.data.token;
    testData.userId = response.data.data.user._id;
    console.log('✅ Resident token obtained');
    return true;
  } catch (error) {
    console.error('❌ Failed to get resident token:', error.response?.data || error.message);
    return false;
  }
};

// Test 2: Get User Profile
const testGetUserProfile = async () => {
  console.log('👤 Testing get user profile...');
  
  try {
    const response = await apiRequest('GET', '/api/user-profile/me', null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ User profile retrieved');
    console.log('📋 Profile data:', {
      name: response.data.data.name,
      email: response.data.data.email,
      role: response.data.data.role,
      hasProfilePhoto: !!response.data.data.profilePhotoId
    });
    return true;
  } catch (error) {
    console.error('❌ Get user profile failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 3: Update User Profile
const testUpdateUserProfile = async () => {
  console.log('✏️ Testing update user profile...');
  
  try {
    const updateData = {
      name: 'Updated Resident Name',
      phoneNumber: '+1234567890',
      address: '123 Updated Street',
      city: 'Updated City',
      pincode: '123456'
    };
    
    const response = await apiRequest('PUT', '/api/user-profile/me', updateData, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ User profile updated');
    console.log('📝 Updated fields:', {
      name: response.data.data.name,
      phoneNumber: response.data.data.phoneNumber,
      address: response.data.data.address
    });
    return true;
  } catch (error) {
    console.error('❌ Update user profile failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 4: Upload Profile Photo
const testUploadProfilePhoto = async () => {
  console.log('📤 Testing upload profile photo...');
  
  try {
    // Create test image
    const testImagePath = createTestImage();
    console.log('✅ Test image created');
    
    // Create form data
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath));
    
    const response = await axios.post(
      `${API_BASE}/api/user-profile/me/photo`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${testData.residentToken}`
        }
      }
    );
    
    console.log('✅ Profile photo uploaded successfully');
    console.log('📸 Photo details:', {
      photoId: response.data.data.photoId,
      filename: response.data.data.filename,
      size: response.data.data.size,
      photoUrl: response.data.data.photoUrl
    });
    
    // Clean up test image
    fs.unlinkSync(testImagePath);
    
    return true;
  } catch (error) {
    console.error('❌ Upload profile photo failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 5: Get Profile Photo
const testGetProfilePhoto = async () => {
  console.log('🖼️ Testing get profile photo...');
  
  try {
    const response = await apiRequest('GET', '/api/user-profile/me/photo', null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Profile photo retrieved');
    console.log('📊 Response type:', typeof response.data);
    return true;
  } catch (error) {
    console.error('❌ Get profile photo failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 6: Update Profile Photo
const testUpdateProfilePhoto = async () => {
  console.log('🔄 Testing update profile photo...');
  
  try {
    // Create new test image
    const testImagePath = createTestImage();
    console.log('✅ New test image created');
    
    // Create form data
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath));
    
    const response = await axios.put(
      `${API_BASE}/api/user-profile/me/photo`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${testData.residentToken}`
        }
      }
    );
    
    console.log('✅ Profile photo updated successfully');
    console.log('📸 Updated photo details:', {
      photoId: response.data.data.photoId,
      filename: response.data.data.filename,
      size: response.data.data.size
    });
    
    // Clean up test image
    fs.unlinkSync(testImagePath);
    
    return true;
  } catch (error) {
    console.error('❌ Update profile photo failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 7: Get Updated User Profile
const testGetUpdatedProfile = async () => {
  console.log('👤 Testing get updated user profile...');
  
  try {
    const response = await apiRequest('GET', '/api/user-profile/me', null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Updated user profile retrieved');
    console.log('📋 Profile with photo:', {
      name: response.data.data.name,
      hasProfilePhoto: !!response.data.data.profilePhotoId,
      profilePhotoUrl: response.data.data.profilePhotoId?.photoUrl
    });
    return true;
  } catch (error) {
    console.error('❌ Get updated profile failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 8: Delete Profile Photo
const testDeleteProfilePhoto = async () => {
  console.log('🗑️ Testing delete profile photo...');
  
  try {
    const response = await apiRequest('DELETE', '/api/user-profile/me/photo', null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Profile photo deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Delete profile photo failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 9: Verify Photo Deleted
const testVerifyPhotoDeleted = async () => {
  console.log('✅ Testing verify photo deleted...');
  
  try {
    const response = await apiRequest('GET', '/api/user-profile/me', null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Profile verification completed');
    console.log('📋 Profile without photo:', {
      name: response.data.data.name,
      hasProfilePhoto: !!response.data.data.profilePhotoId,
      profilePicture: response.data.data.profilePicture
    });
    return true;
  } catch (error) {
    console.error('❌ Verify photo deleted failed:', error.response?.data || error.message);
    return false;
  }
};

// Main test function
const runUserProfileTests = async () => {
  console.log('🚀 Starting User Profile Photo Tests...\n');
  
  const tests = [
    { name: 'Get Resident Token', fn: getResidentToken },
    { name: 'Get User Profile', fn: testGetUserProfile },
    { name: 'Update User Profile', fn: testUpdateUserProfile },
    { name: 'Upload Profile Photo', fn: testUploadProfilePhoto },
    { name: 'Get Profile Photo', fn: testGetProfilePhoto },
    { name: 'Update Profile Photo', fn: testUpdateProfilePhoto },
    { name: 'Get Updated Profile', fn: testGetUpdatedProfile },
    { name: 'Delete Profile Photo', fn: testDeleteProfilePhoto },
    { name: 'Verify Photo Deleted', fn: testVerifyPhotoDeleted }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 TEST RESULTS:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All user profile photo tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
};

// Run tests
if (require.main === module) {
  runUserProfileTests().catch(console.error);
}

module.exports = {
  runUserProfileTests,
  testData
};
