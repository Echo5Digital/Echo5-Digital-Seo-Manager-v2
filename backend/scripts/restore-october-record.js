require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// ⚠️ EDIT THESE VALUES TO MATCH YOUR OCTOBER DATA ⚠️
const OCTOBER_DATA = {
  domain: 'vipgts.com',
  keyword: 'Executive Transportation New York', // Change if different
  rank: 8, // October rank was #8
  location: 'United States',
  locationCode: 2840,
  checkedDate: new Date(2025, 9, 15), // October 15, 2025 (month is 0-indexed)
};

async function restoreOctoberRecord() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const RankHistory = require(path.join(__dirname, '../models/RankHistory.model'));
    const Client = mongoose.model('Client', new mongoose.Schema({}, {strict: false}));

    // Validate that rank is set
    if (OCTOBER_DATA.rank === null) {
      console.log('⚠️  ERROR: Please edit the script and set the October rank!');
      console.log('\n📝 Instructions:');
      console.log('   1. Open this file: backend/scripts/restore-october-record.js');
      console.log('   2. Find line 9: rank: null,');
      console.log('   3. Change it to: rank: YOUR_OCTOBER_RANK,');
      console.log('   4. Save and run again\n');
      console.log('Example:');
      console.log('   If the October rank was #12, change to:');
      console.log('   rank: 12,\n');
      process.exit(1);
    }

    // Find the VIPGTS client
    const vipClient = await Client.findOne({ website: { $regex: 'vipgts', $options: 'i' } });
    
    if (!vipClient) {
      console.log('❌ VIPGTS client not found');
      process.exit(1);
    }

    console.log('✅ Found VIPGTS client:', vipClient.name);
    console.log(`   Client ID: ${vipClient._id}\n`);

    // Check if October record already exists
    const existingOctober = await RankHistory.findOne({
      domain: OCTOBER_DATA.domain,
      keyword: OCTOBER_DATA.keyword,
      month: 10,
      year: 2025
    });

    if (existingOctober) {
      console.log('⚠️  October record already exists!');
      console.log(`   Current rank: ${existingOctober.rank}`);
      console.log(`   Do you want to update it? (Edit the script to change rank)\n`);
      process.exit(0);
    }

    // Create the October record
    const octoberRecord = {
      domain: OCTOBER_DATA.domain,
      keyword: OCTOBER_DATA.keyword,
      rank: OCTOBER_DATA.rank,
      inTop100: OCTOBER_DATA.rank && OCTOBER_DATA.rank <= 100,
      difficulty: 50, // Default difficulty
      location: OCTOBER_DATA.location,
      locationCode: OCTOBER_DATA.locationCode,
      month: 10, // October
      year: 2025,
      checkedAt: OCTOBER_DATA.checkedDate,
      source: 'manual', // Mark as manually restored
      client: vipClient._id,
      previousRank: null,
      rankChange: null
    };

    console.log('📝 Creating October record with the following data:');
    console.log(`   Domain: ${octoberRecord.domain}`);
    console.log(`   Keyword: ${octoberRecord.keyword}`);
    console.log(`   Rank: #${octoberRecord.rank}`);
    console.log(`   Month/Year: 10/2025`);
    console.log(`   Date: ${octoberRecord.checkedAt}`);
    console.log(`   Source: ${octoberRecord.source} (manually restored)`);
    console.log(`   Client: ${vipClient.name}\n`);

    const created = await RankHistory.create(octoberRecord);
    console.log('✅ October record created successfully!');
    console.log(`   Record ID: ${created._id}\n`);

    // Show updated summary
    const vipRecords = await RankHistory.find({
      domain: { $regex: 'vipgts', $options: 'i' }
    }).sort({ year: 1, month: 1 });

    console.log('📊 Updated VIPGTS rank history:');
    vipRecords.forEach(record => {
      console.log(`   ${record.year}-${String(record.month).padStart(2, '0')}: "${record.keyword}" - Rank #${record.rank || 'Not ranked'} (${record.source})`);
    });

    console.log('\n✨ October data has been restored!');
    console.log('   You can now see month-over-month comparison in the dashboard.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

restoreOctoberRecord();
