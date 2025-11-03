require('dotenv').config();
const mongoose = require('mongoose');

async function checkOplog() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    console.log('🔍 Attempting to query oplog for deleted vipgts.com records...\n');

    try {
      // Switch to local database where oplog resides
      const localDb = mongoose.connection.client.db('local');
      const oplog = localDb.collection('oplog.rs');

      // Check if we can access oplog
      const oplogCount = await oplog.countDocuments();
      console.log(`📊 Oplog entries available: ${oplogCount}`);

      if (oplogCount === 0) {
        console.log('⚠️  Oplog is empty or not accessible');
        process.exit(0);
      }

      // Look for recent delete operations on rankhistories collection
      const recentDeletes = await oplog.find({
        ns: /rankhistories/i,
        op: 'd', // delete operation
        wall: { 
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }).sort({ ts: -1 }).limit(50).toArray();

      console.log(`\n🔍 Found ${recentDeletes.length} recent delete operations\n`);

      if (recentDeletes.length > 0) {
        console.log('Recent deletions:');
        recentDeletes.forEach((entry, idx) => {
          console.log(`\n[${idx + 1}] Deleted at: ${entry.wall}`);
          console.log(`    Document ID: ${entry.o._id}`);
          console.log(`    Namespace: ${entry.ns}`);
        });

        console.log('\n⚠️  Note: Oplog only stores operation metadata, not full document data.');
        console.log('   We can see WHAT was deleted but not the full content.');
      }

      // Try to find the deletion operation from today
      const todayDeletes = await oplog.find({
        ns: /rankhistories/i,
        op: 'd',
        wall: {
          $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
        }
      }).toArray();

      if (todayDeletes.length > 0) {
        console.log(`\n\n📝 Deletions from the last 2 hours: ${todayDeletes.length}`);
        console.log('   This likely includes your vipgts.com October record');
        console.log('   Document IDs that were deleted:');
        todayDeletes.forEach(del => {
          console.log(`   - ${del.o._id}`);
        });
      }

    } catch (oplogError) {
      console.log('❌ Cannot access oplog:', oplogError.message);
      console.log('   You may need special permissions to query the oplog');
    }

    console.log('\n\n💡 Alternative: If you remember the October rank, I can create a record for you manually.');
    console.log('   Just provide:');
    console.log('   - Keyword name');
    console.log('   - Rank position in October');
    console.log('   - Approximate date checked');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkOplog();
