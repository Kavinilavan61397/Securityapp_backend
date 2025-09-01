require("dotenv").config();

const mongoose = require('mongoose');
require('dotenv').config();

async function testVisitorModel() {
  console.log('🧪 Testing Visitor Model Directly');
  
  try {
    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    // Import Visitor model
    console.log('2. Importing Visitor model...');
    const Visitor = require('./src/models/Visitor');
    console.log('✅ Visitor model imported');
    
    // Test simple query
    console.log('3. Testing simple Visitor query...');
    const count = await Visitor.countDocuments();
    console.log('✅ Visitor count query successful:', count);
    
    // Test find query
    console.log('4. Testing Visitor find query...');
    const visitors = await Visitor.find().limit(1);
    console.log('✅ Visitor find query successful, found:', visitors.length);
    
    console.log('🎉 Visitor model is working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing Visitor model:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  }
}

testVisitorModel();
