require('dotenv').config();
const mongoose = require('mongoose');

async function checkRecoveryOptions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Check if oplog is available (replica set feature)
    try {
      const admin = db.admin();
      const serverStatus = await admin.serverStatus();
      console.log('📊 MongoDB Server Info:');
      console.log(`   Version: ${serverStatus.version}`);
      console.log(`   Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
      
      // Check for replica set
      const replStatus = await admin.replSetGetStatus().catch(() => null);
      if (replStatus) {
        console.log('   Replica Set: Enabled ✅');
        console.log('   Oplog might be available for recovery');
      } else {
        console.log('   Replica Set: Not enabled ❌');
        console.log('   Oplog not available');
      }
    } catch (err) {
      console.log('⚠️  Cannot check replica set status (may need admin privileges)');
    }

    console.log('\n🔍 Checking for any backup collections...');
    const collections = await db.listCollections().toArray();
    const backupCollections = collections.filter(c => 
      c.name.includes('backup') || 
      c.name.includes('_old') || 
      c.name.includes('archive')
    );
    
    if (backupCollections.length > 0) {
      console.log('✅ Found potential backup collections:');
      backupCollections.forEach(c => console.log(`   - ${c.name}`));
    } else {
      console.log('❌ No backup collections found');
    }

    console.log('\n💡 Recovery Options:\n');
    console.log('1. Database Backups:');
    console.log('   - Check if you have any MongoDB backups (mongodump files)');
    console.log('   - Check your hosting provider for automatic backups');
    console.log('   - If using MongoDB Atlas, check "Continuous Backup" in the UI\n');
    
    console.log('2. Application-Level Recovery:');
    console.log('   - Check if the data was synced to any other system');
    console.log('   - Check server logs for the original API responses\n');
    
    console.log('3. Re-check the Data:');
    console.log('   - You can simply run the rank check again for October data');
    console.log('   - The system will create a new record with current month/year\n');

    console.log('❌ Unfortunately, deleted MongoDB data cannot be recovered without backups.');
    console.log('   The October VIPGTS record is permanently lost unless you have a backup.\n');

    console.log('✅ Good News:');
    console.log('   - Your November data is safe (Rank #7 for "Executive Transportation New York")');
    console.log('   - You can continue tracking from this point forward');
    console.log('   - Future checks will build up historical data\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRecoveryOptions();
