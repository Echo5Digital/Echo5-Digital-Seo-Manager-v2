require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

async function removeSampleData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const RankHistory = require(path.join(__dirname, '../models/RankHistory.model'));

    // Check what we have before deletion
    const beforeCount = await RankHistory.countDocuments({ domain: { $regex: 'vipgts', $options: 'i' } });
    console.log(`📊 Current vipgts.com records: ${beforeCount}\n`);

    if (beforeCount === 0) {
      console.log('✅ No vipgts.com data to remove');
      process.exit(0);
    }

    // Show a sample of what will be deleted
    const sampleRecords = await RankHistory.find({ 
      domain: { $regex: 'vipgts', $options: 'i' } 
    }).limit(5).select('keyword rank month year checkedAt');

    console.log('🗑️  Sample of records to be deleted:');
    sampleRecords.forEach((record, idx) => {
      console.log(`  [${idx + 1}] ${record.keyword} - Rank: ${record.rank || 'Not ranked'} - ${record.year}-${String(record.month).padStart(2, '0')}`);
    });

    console.log('\n⚠️  Deleting all vipgts.com sample/dummy data...\n');

    // Delete all vipgts.com records
    const result = await RankHistory.deleteMany({
      domain: { $regex: 'vipgts', $options: 'i' }
    });

    console.log(`✅ Deleted ${result.deletedCount} vipgts.com records\n`);

    // Verify deletion
    const afterCount = await RankHistory.countDocuments({ domain: { $regex: 'vipgts', $options: 'i' } });
    console.log(`📊 Remaining vipgts.com records: ${afterCount}`);

    // Show total records in database
    const totalRecords = await RankHistory.countDocuments({});
    console.log(`📊 Total RankHistory records remaining: ${totalRecords}\n`);

    console.log('✨ Sample data removed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeSampleData();
