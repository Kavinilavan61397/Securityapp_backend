const mongoose = require('mongoose');
const Visitor = require('./src/models/Visitor');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/securityapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

/**
 * Migration script to standardize serviceType format
 * Converts all serviceType values to service(value) format
 */
async function migrateServiceType() {
  try {
    console.log('🚀 Starting serviceType migration...');
    
    // Find all visitors with serviceType field
    const visitors = await Visitor.find({ 
      serviceType: { $exists: true, $ne: null, $ne: '' } 
    });
    
    console.log(`📊 Found ${visitors.length} visitors with serviceType`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const visitor of visitors) {
      const originalServiceType = visitor.serviceType;
      
      // Skip if already in correct format
      if (originalServiceType.startsWith('service(') && originalServiceType.endsWith(')')) {
        skippedCount++;
        continue;
      }
      
      // Standardize the format
      const standardizedServiceType = `service(${originalServiceType})`;
      
      // Update the visitor
      await Visitor.updateOne(
        { _id: visitor._id },
        { serviceType: standardizedServiceType }
      );
      
      console.log(`✅ Updated: "${originalServiceType}" → "${standardizedServiceType}"`);
      updatedCount++;
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Updated: ${updatedCount} records`);
    console.log(`⏭️  Skipped: ${skippedCount} records (already in correct format)`);
    console.log(`📊 Total processed: ${visitors.length} records`);
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration
migrateServiceType();

