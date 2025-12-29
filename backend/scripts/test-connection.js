import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reviewonly';

console.log('Testing MongoDB connection...');
console.log(`URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials

mongoose.connect(MONGODB_URI)
.then(async () => {
  console.log('✅ Connection successful!');
  
  // Test database operations
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📊 Collections in database: ${collections.length}`);
    if (collections.length > 0) {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    } else {
      console.log('   (No collections yet - this is normal for a new database)');
    }
    
    // Test a simple operation
    const dbName = mongoose.connection.name;
    console.log(`\n💾 Database name: ${dbName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    console.log('\n✅ All tests passed! MongoDB is ready to use.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing database:', error);
    process.exit(1);
  }
})
.catch(err => {
  console.error('❌ Connection failed:', err.message);
  console.error('\n💡 Troubleshooting:');
  console.error('   1. Check if MongoDB is running');
  console.error('   2. Verify MONGODB_URI in .env file');
  console.error('   3. Check network connectivity (for Atlas)');
  console.error('   4. Verify credentials and IP whitelist (for Atlas)');
  process.exit(1);
});

