require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

async function showDetailedRecords() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const RankHistory = require(path.join(__dirname, '../models/RankHistory.model'));

    // Get all records with full details
    const allRecords = await RankHistory.find({}).sort({ checkedAt: -1 });
    
    console.log(`📊 Detailed view of all ${allRecords.length} records:\n`);

    allRecords.forEach((record, idx) => {
      console.log(`[${idx + 1}] ${record.domain}`);
      console.log(`    Keyword: ${record.keyword}`);
      console.log(`    Rank: ${record.rank || 'Not ranked'}`);
      console.log(`    Month/Year: ${record.month}/${record.year}`);
      console.log(`    Checked At: ${record.checkedAt}`);
      console.log(`    Source: ${record.source}`);
      console.log(`    Client: ${record.client || 'Not linked'}`);
      console.log(`    Created At: ${record.createdAt}`);
      console.log('');
    });

    // Check if the vipgts record has a client link
    const vipRecord = await RankHistory.findOne({ 
      domain: { $regex: 'vipgts', $options: 'i' } 
    }).populate('client');

    if (vipRecord) {
      console.log('✅ VIPGTS Real Data Status:');
      console.log(`   Keyword: ${vipRecord.keyword}`);
      console.log(`   Rank: ${vipRecord.rank}`);
      console.log(`   Month: ${vipRecord.month}/${vipRecord.year}`);
      console.log(`   Client Linked: ${vipRecord.client ? 'Yes - ' + vipRecord.client.name : 'No'}`);
      console.log(`   This appears to be REAL data from an actual rank check!`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

showDetailedRecords();
