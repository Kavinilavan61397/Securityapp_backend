require("dotenv").config();

const mongoose = require('mongoose');
require('dotenv').config();

async function testUserModel() {
  console.log('🧪 Testing User Model Directly');
  
  try {
    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    // Import User model
    console.log('2. Importing User model...');
    const User = require('./src/models/User');
    console.log('✅ User model imported');
    
    // Test simple query
    console.log('3. Testing simple User query...');
    const count = await User.countDocuments();
    console.log('✅ User count query successful:', count);
    
    // Test findById query (the one that's hanging)
    console.log('4. Testing User findById query...');
    const users = await User.find().limit(1);
    if (users.length > 0) {
      const user = await User.findById(users[0]._id).select('-otp');
      console.log('✅ User findById query successful:', user.email);
    } else {
      console.log('ℹ️ No users found to test findById');
    }
    
    console.log('🎉 User model is working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing User model:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  }
}

testUserModel();
