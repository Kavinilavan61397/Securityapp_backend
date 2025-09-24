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
  photoId: null
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
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  
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
    const response = await apiRequest('POST', '/auth/login', {
      username: 'resident1',
      password: 'SecurePass123!'
    });
    
    testData.residentToken = response.data.data.token;
    console.log('✅ Resident token obtained');
    return true;
  } catch (error) {
    console.error('❌ Failed to get resident token:', error.response?.data || error.message);
    return false;
  }
};

// Test 2: Upload Photo
const testPhotoUpload = async () => {
  console.log('📤 Testing photo upload...');
  
  try {
    // Create test image
    const testImagePath = createTestImage();
    console.log('✅ Test image created');
    
    // Create form data
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath));
    formData.append('relatedType', 'VISITOR');
    formData.append('description', 'Test visitor photo');
    formData.append('tags', JSON.stringify(['test', 'visitor', 'verification']));
    formData.append('isPublic', 'false');
    
    const response = await axios.post(
      `${API_BASE}/api/photos/${testData.buildingId}/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${testData.residentToken}`
        }
      }
    );
    
    testData.photoId = response.data.data.photoId;
    console.log('✅ Photo uploaded successfully:', testData.photoId);
    
    // Clean up test image
    fs.unlinkSync(testImagePath);
    
    return true;
  } catch (error) {
    console.error('❌ Photo upload failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 3: Get Photos
const testGetPhotos = async () => {
  console.log('📋 Testing get photos...');
  
  try {
    const response = await apiRequest('GET', `/api/photos/${testData.buildingId}`, null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Photos retrieved:', response.data.data.photos.length);
    console.log('📊 Pagination:', response.data.data.pagination);
    return true;
  } catch (error) {
    console.error('❌ Get photos failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 4: Get Photo by ID
const testGetPhotoById = async () => {
  console.log('🔍 Testing get photo by ID...');
  
  try {
    const response = await apiRequest('GET', `/api/photos/${testData.buildingId}/${testData.photoId}`, null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Photo by ID retrieved');
    console.log('📸 Photo details:', {
      photoId: response.data.data.photoId,
      originalName: response.data.data.originalName,
      size: response.data.data.size,
      relatedType: response.data.data.relatedType
    });
    return true;
  } catch (error) {
    console.error('❌ Get photo by ID failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 5: Update Photo
const testUpdatePhoto = async () => {
  console.log('✏️ Testing photo update...');
  
  try {
    const updateData = {
      description: 'Updated test visitor photo',
      tags: ['test', 'visitor', 'updated'],
      isPublic: false
    };
    
    const response = await apiRequest('PUT', `/api/photos/${testData.buildingId}/${testData.photoId}`, updateData, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Photo updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Photo update failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 6: Search Photos
const testSearchPhotos = async () => {
  console.log('🔍 Testing photo search...');
  
  try {
    const response = await apiRequest('GET', `/api/photos/${testData.buildingId}/search?q=test`, null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Photo search completed:', response.data.data.photos.length, 'results');
    return true;
  } catch (error) {
    console.error('❌ Photo search failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 7: Get Photo Stats
const testPhotoStats = async () => {
  console.log('📊 Testing photo statistics...');
  
  try {
    const response = await apiRequest('GET', `/api/photos/${testData.buildingId}/stats`, null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Photo stats retrieved');
    console.log('📈 Stats:', response.data.data.stats);
    return true;
  } catch (error) {
    console.error('❌ Photo stats failed:', error.response?.data || error.message);
    return false;
  }
};

// Test 8: Delete Photo
const testDeletePhoto = async () => {
  console.log('🗑️ Testing photo deletion...');
  
  try {
    const response = await apiRequest('DELETE', `/api/photos/${testData.buildingId}/${testData.photoId}`, null, {
      'Authorization': `Bearer ${testData.residentToken}`
    });
    
    console.log('✅ Photo deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Photo deletion failed:', error.response?.data || error.message);
    return false;
  }
};

// Main test function
const runPhotoTests = async () => {
  console.log('🚀 Starting Photo Functionality Tests...\n');
  
  const tests = [
    { name: 'Get Resident Token', fn: getResidentToken },
    { name: 'Upload Photo', fn: testPhotoUpload },
    { name: 'Get Photos', fn: testGetPhotos },
    { name: 'Get Photo by ID', fn: testGetPhotoById },
    { name: 'Update Photo', fn: testUpdatePhoto },
    { name: 'Search Photos', fn: testSearchPhotos },
    { name: 'Get Photo Stats', fn: testPhotoStats },
    { name: 'Delete Photo', fn: testDeletePhoto }
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
    console.log('\n🎉 All photo functionality tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
};

// Run tests
if (require.main === module) {
  runPhotoTests().catch(console.error);
}

module.exports = {
  runPhotoTests,
  testData
};
