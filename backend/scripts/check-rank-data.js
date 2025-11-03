require('dotenv').config();
const mongoose = require('mongoose');
const RankHistory = require('../models/RankHistory.model');

async function checkRankData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all records
    const allRecords = await RankHistory.find({}).sort({ checkedAt: -1 });
    console.log(`📊 Total RankHistory records: ${allRecords.length}\n`);

    // Group by domain
    const byDomain = {};
    allRecords.forEach(record => {
      if (!byDomain[record.domain]) {
        byDomain[record.domain] = [];
      }
      byDomain[record.domain].push(record);
    });

    console.log('📋 Records by Domain:');
    Object.keys(byDomain).forEach(domain => {
      console.log(`\n  ${domain}: ${byDomain[domain].length} records`);
      
      // Show month/year breakdown
      const byMonth = {};
      byDomain[domain].forEach(record => {
        const monthKey = `${record.year}-${String(record.month).padStart(2, '0')}`;
        if (!byMonth[monthKey]) byMonth[monthKey] = [];
        byMonth[monthKey].push(record);
      });
      
      Object.keys(byMonth).sort().forEach(monthKey => {
        const records = byMonth[monthKey];
        const keywords = [...new Set(records.map(r => r.keyword))];
        console.log(`    ${monthKey}: ${records.length} checks, ${keywords.length} unique keywords`);
        keywords.forEach(kw => {
          const kwRecords = records.filter(r => r.keyword === kw);
          const rank = kwRecords[0].rank;
          console.log(`      - "${kw}": rank ${rank || 'Not ranked'}`);
        });
      });
    });

    // Check for vipgts.com specifically
    console.log('\n\n🔍 Detailed check for vipgts.com:');
    const vipRecords = await RankHistory.find({ 
      domain: { $regex: 'vipgts', $options: 'i' } 
    }).sort({ year: -1, month: -1, checkedAt: -1 });
    
    console.log(`Found ${vipRecords.length} records for vipgts.com`);
    
    if (vipRecords.length > 0) {
      console.log('\nSample records:');
      vipRecords.slice(0, 10).forEach((record, idx) => {
        console.log(`\n[${idx + 1}]`);
        console.log(`  Keyword: ${record.keyword}`);
        console.log(`  Domain: ${record.domain}`);
        console.log(`  Rank: ${record.rank || 'Not ranked'}`);
        console.log(`  Month/Year: ${record.month}/${record.year}`);
        console.log(`  Date: ${record.checkedAt}`);
        console.log(`  Client: ${record.client || 'N/A'}`);
      });
    }

    // Check for records with missing month/year
    const missingDate = await RankHistory.countDocuments({
      $or: [
        { month: { $exists: false } },
        { year: { $exists: false } }
      ]
    });
    
    console.log(`\n\n⚠️  Records without month/year: ${missingDate}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRankData();
