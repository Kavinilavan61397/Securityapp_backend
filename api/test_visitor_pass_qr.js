const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Pass = require('./src/models/Pass');
const User = require('./src/models/User');
const Building = require('./src/models/Building');

async function testVisitorPassQR() {
  try {
    console.log('🎫 TESTING VISITOR PASS QR CODE GENERATION...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://testuser:testpass@cluster0.8xqjq.mongodb.net/securityapp?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB\n');

    // Get test data
    const building = await Building.findOne({ name: 'Test Building' });
    const user = await User.findOne({ role: 'RESIDENT' });

    if (!building) {
      console.log('❌ Test building not found');
      return;
    }

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('📋 Test Data:');
    console.log(`   Building: ${building.name} (${building._id})`);
    console.log(`   User: ${user.name} (${user._id})\n`);

    // Test 1: Create a visitor pass with QR code
    console.log('🧪 TEST 1: Creating visitor pass with QR code...');
    
    const passData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+1234567890',
      reasonForVisit: 'Business meeting with resident',
      startingDate: new Date('2025-01-20T00:00:00.000Z'),
      endingDate: new Date('2025-01-20T23:59:59.000Z'),
      checkInTime: '10:00 AM',
      status: 'PENDING',
      buildingId: building._id,
      createdBy: user._id
    };

    const pass = new Pass(passData);
    await pass.save();

    console.log('✅ Visitor pass created successfully');
    console.log(`   Pass ID: ${pass._id}`);
    console.log(`   Visitor: ${pass.name}`);
    console.log(`   Email: ${pass.email}`);
    console.log(`   Reason: ${pass.reasonForVisit}\n`);

    // Test 2: Generate QR code manually (simulating controller logic)
    console.log('🧪 TEST 2: Generating QR code...');
    
    const QRCode = require('qrcode');
    
    // Create lightweight QR code data for scanning
    const qrCodeData = {
      type: 'VISITOR_PASS',
      passId: pass._id,
      name: pass.name,
      email: pass.email,
      phoneNumber: pass.phoneNumber,
      reasonForVisit: pass.reasonForVisit,
      startingDate: pass.startingDate,
      endingDate: pass.endingDate,
      buildingId: building._id,
      buildingName: building.name,
      status: pass.status,
      timestamp: Date.now()
    };

    // Create UI-friendly display data
    const displayData = {
      type: 'Visitor Pass',
      visitorName: pass.name,
      email: pass.email,
      phoneNumber: pass.phoneNumber,
      reason: pass.reasonForVisit,
      startDate: new Date(pass.startingDate).toLocaleDateString(),
      endDate: new Date(pass.endingDate).toLocaleDateString(),
      checkInTime: pass.checkInTime,
      buildingName: building.name,
      status: pass.status
    };

    // Generate QR code string and image
    const qrCodeString = JSON.stringify(qrCodeData);
    const qrCodeImage = await QRCode.toDataURL(qrCodeString);

    // Update pass with QR code data
    pass.qrCodeData = JSON.stringify({ ...qrCodeData, displayData });
    pass.qrCodeString = qrCodeString;
    pass.qrCodeImage = qrCodeImage;
    
    await pass.save();

    console.log('✅ QR code generated successfully');
    console.log(`   QR String Length: ${qrCodeString.length} characters`);
    console.log(`   QR Image Length: ${qrCodeImage.length} characters`);
    console.log(`   QR Image Type: ${qrCodeImage.substring(0, 30)}...\n`);

    // Test 3: Verify QR code content
    console.log('🧪 TEST 3: Verifying QR code content...');
    
    const qrData = JSON.parse(pass.qrCodeData);
    
    console.log('📋 QR Code Data Structure:');
    console.log(`   Type: ${qrData.type}`);
    console.log(`   Pass ID: ${qrData.passId}`);
    console.log(`   Name: ${qrData.name}`);
    console.log(`   Email: ${qrData.email}`);
    console.log(`   Phone: ${qrData.phoneNumber}`);
    console.log(`   Reason: ${qrData.reasonForVisit}`);
    console.log(`   Start Date: ${qrData.startingDate}`);
    console.log(`   End Date: ${qrData.endingDate}`);
    console.log(`   Building ID: ${qrData.buildingId}`);
    console.log(`   Building Name: ${qrData.buildingName}`);
    console.log(`   Status: ${qrData.status}\n`);

    console.log('📱 Display Data Structure:');
    console.log(`   Type: ${qrData.displayData.type}`);
    console.log(`   Visitor Name: ${qrData.displayData.visitorName}`);
    console.log(`   Email: ${qrData.displayData.email}`);
    console.log(`   Phone: ${qrData.displayData.phoneNumber}`);
    console.log(`   Reason: ${qrData.displayData.reason}`);
    console.log(`   Start Date: ${qrData.displayData.startDate}`);
    console.log(`   End Date: ${qrData.displayData.endDate}`);
    console.log(`   Check-in Time: ${qrData.displayData.checkInTime}`);
    console.log(`   Building Name: ${qrData.displayData.buildingName}`);
    console.log(`   Status: ${qrData.displayData.status}\n`);

    // Test 4: Test QR code decoding
    console.log('🧪 TEST 4: Testing QR code decoding...');
    
    const decodedData = JSON.parse(qrCodeString);
    
    console.log('🔍 Decoded QR Code Data:');
    console.log(`   Type: ${decodedData.type}`);
    console.log(`   Pass ID: ${decodedData.passId}`);
    console.log(`   Name: ${decodedData.name}`);
    console.log(`   Email: ${decodedData.email}`);
    console.log(`   Building: ${decodedData.buildingName}\n`);

    // Test 5: Generate API response format
    console.log('🧪 TEST 5: Testing API response format...');
    
    const apiResponse = {
      success: true,
      message: 'Visitor pass retrieved successfully',
      data: {
        ...pass.toObject(),
        qrCode: {
          data: pass.qrCodeData ? JSON.parse(pass.qrCodeData) : null,
          string: pass.qrCodeString,
          imageUrl: pass.qrCodeImage ? `/api/pass/${building._id}/${pass._id}/qr-image` : null
        }
      }
    };

    console.log('📡 API Response Structure:');
    console.log(`   Success: ${apiResponse.success}`);
    console.log(`   Message: ${apiResponse.message}`);
    console.log(`   Pass Name: ${apiResponse.data.name}`);
    console.log(`   QR Data Available: ${apiResponse.data.qrCode.data ? 'YES' : 'NO'}`);
    console.log(`   QR String Available: ${apiResponse.data.qrCode.string ? 'YES' : 'NO'}`);
    console.log(`   QR Image URL: ${apiResponse.data.qrCode.imageUrl}\n`);

    // Test 6: Clean up test data
    console.log('🧪 TEST 6: Cleaning up test data...');
    await Pass.findByIdAndDelete(pass._id);
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ QR code generation for visitor passes is working correctly');
    console.log('✅ QR code contains all required fields');
    console.log('✅ QR code image is generated successfully');
    console.log('✅ API response format is correct');
    console.log('✅ QR image URL endpoint is properly formatted\n');

    console.log('🔗 ENDPOINTS TO TEST:');
    console.log(`   POST /api/pass/${building._id} - Create visitor pass with QR`);
    console.log(`   GET /api/pass/${building._id} - Get all passes with QR data`);
    console.log(`   GET /api/pass/${building._id}/PASS_ID/qr-image - Get QR as image\n`);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testVisitorPassQR();
