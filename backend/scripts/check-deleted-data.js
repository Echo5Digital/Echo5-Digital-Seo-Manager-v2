require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

async function checkDeletedData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const RankHistory = require(path.join(__dirname, '../models/RankHistory.model'));

    // Check current vipgts records
    const currentRecords = await RankHistory.find({ 
      domain: { $regex: 'vipgts', $options: 'i' } 
    });

    console.log(`📊 Current vipgts.com records in database: ${currentRecords.length}\n`);

    if (currentRecords.length > 0) {
      console.log('Found records:');
      currentRecords.forEach(record => {
        console.log(`  - ${record.keyword} | Rank: ${record.rank || 'Not ranked'} | ${record.year}-${String(record.month).padStart(2, '0')} | Source: ${record.source}`);
      });
    }

    // Check all records
    const allRecords = await RankHistory.find({}).sort({ checkedAt: -1 });
    console.log(`\n📊 Total records in database: ${allRecords.length}\n`);

    if (allRecords.length > 0) {
      console.log('All records by domain:');
      const byDomain = {};
      allRecords.forEach(record => {
        if (!byDomain[record.domain]) byDomain[record.domain] = [];
        byDomain[record.domain].push(record);
      });

      Object.keys(byDomain).forEach(domain => {
        console.log(`  ${domain}: ${byDomain[domain].length} records`);
      });
    }

    // Unfortunately, we can't recover deleted data from MongoDB unless you have backups
    // But let's check if there were any real checks (from dataforseo source with recent dates)
    console.log('\n💡 Note: The sample data was created on Nov 15, 2025 (future date)');
    console.log('   Real data from DataForSEO would have today\'s date or earlier actual check dates');
    console.log('   If you had real rank checks before running the sample data script, they may have been overwritten.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDeletedData();
