import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

console.log('🔍 Verifying MongoDB Connection...\n');
console.log('Connection String (hidden):', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
console.log('');

// Check connection string format
if (!MONGODB_URI.startsWith('mongodb+srv://')) {
  console.warn('⚠️  Warning: Connection string should start with mongodb+srv:// for Atlas');
}

// Extract and check components
try {
  const urlMatch = MONGODB_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (urlMatch) {
    const [, username, password, cluster, database] = urlMatch;
    console.log('✅ Connection string format looks correct');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password.length} characters`);
    console.log(`   Cluster: ${cluster}`);
    console.log(`   Database: ${database}`);
    console.log('');
    
    // Check for special characters in password
    const specialChars = /[!@#$%^&*(),.?":{}|<>]/;
    if (specialChars.test(password)) {
      console.warn('⚠️  Password contains special characters - they may need URL encoding');
      console.warn('   Special characters should be encoded (e.g., @ = %40, # = %23)');
    }
  }
} catch (e) {
  console.warn('⚠️  Could not parse connection string format');
}

console.log('Attempting connection...\n');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000, // 10 second timeout
})
.then(async () => {
  console.log('✅ Connection successful!');
  console.log(`   Database: ${mongoose.connection.name}`);
  console.log(`   Host: ${mongoose.connection.host}`);
  console.log(`   Ready State: ${mongoose.connection.readyState}`);
  
  // Test a simple operation
  try {
    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.ping();
    console.log('✅ Server ping successful');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error pinging server:', error.message);
    process.exit(1);
  }
})
.catch(err => {
  console.error('❌ Connection failed:', err.message);
  console.error('');
  
  if (err.message.includes('ETIMEOUT') || err.message.includes('ENOTFOUND')) {
    console.error('🔴 DNS/Network Issue Detected');
    console.error('');
    console.error('Possible causes:');
    console.error('   1. IP whitelist changes may still be propagating (wait 2-3 minutes)');
    console.error('   2. Network/firewall blocking connection');
    console.error('   3. DNS resolution issue');
    console.error('');
    console.error('Try these steps:');
    console.error('   1. Wait 2-3 minutes and try again');
    console.error('   2. Check if you can ping the cluster:');
    console.error(`      ping ${MONGODB_URI.match(/@([^/]+)/)?.[1] || 'cluster'}`);
    console.error('   3. Try from a different network');
    console.error('   4. Check if your firewall/antivirus is blocking the connection');
  } else if (err.message.includes('authentication')) {
    console.error('🔴 Authentication Issue');
    console.error('   - Verify username and password are correct');
    console.error('   - Check if password has special characters that need URL encoding');
  } else {
    console.error('   Error type:', err.name);
    console.error('   Full error:', err);
  }
  
  process.exit(1);
});

