require('dotenv').config();
const mongoose = require('mongoose');
const RankHistory = require('../models/RankHistory.model');

async function addSampleData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const domain = 'vipgts.com'; // Use one of your existing domains
    const location = 'United States';
    const locationCode = 2840;

    const keywords = [
      'Executive Transportation New York',
      'NYC Event Transportation',
      'Luxury Car Service NYC',
      'Corporate Transportation NYC',
      'Airport Limo Service NYC'
    ];

    const sampleData = [];
    const now = new Date();

    // Generate data for the last 6 months
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      keywords.forEach((keyword, idx) => {
        // Simulate rank progression
        // Some keywords improve, some decline, some stable
        let baseRank;
        let rankProgression;

        if (idx === 0) {
          // Improving keyword: started at 45, now at 12
          baseRank = 45 - (monthOffset * 6);
          rankProgression = 'improving';
        } else if (idx === 1) {
          // Declining keyword: started at 15, now at 35
          baseRank = 15 + (monthOffset * 4);
          rankProgression = 'declining';
        } else if (idx === 2) {
          // Stable keyword: stays around 20-25
          baseRank = 22 + (Math.random() > 0.5 ? 2 : -2);
          rankProgression = 'stable';
        } else if (idx === 3) {
          // New keyword: only shows up in recent months
          if (monthOffset > 2) {
            return; // Skip this keyword for older months
          }
          baseRank = 65 - (monthOffset * 10);
          rankProgression = 'new';
        } else {
          // Lost ranking: was ranked, now not in top 100
          baseRank = monthOffset < 2 ? null : 85 - (monthOffset * 8);
          rankProgression = 'lost';
        }

        const rank = baseRank && baseRank > 0 && baseRank <= 100 ? Math.round(baseRank) : null;

        sampleData.push({
          domain,
          keyword,
          rank,
          inTop100: !!rank,
          difficulty: 50 + idx * 10,
          location,
          locationCode,
          source: 'dataforseo',
          checkedAt: date,
          month,
          year,
          previousRank: null, // Will be calculated
          rankChange: null // Will be calculated
        });
      });
    }

    console.log(`\n📝 Creating ${sampleData.length} sample rank history records...`);
    console.log(`   Domain: ${domain}`);
    console.log(`   Keywords: ${keywords.length}`);
    console.log(`   Months: 6 (last 6 months)`);

    // Delete existing sample data for this domain to avoid duplicates
    const deleted = await RankHistory.deleteMany({ 
      domain,
      source: 'dataforseo'
    });
    console.log(`\n🗑️  Deleted ${deleted.deletedCount} existing records for ${domain}`);

    // Insert sample data
    const inserted = await RankHistory.insertMany(sampleData);
    console.log(`✅ Inserted ${inserted.length} sample records`);

    // Show summary by month
    console.log(`\n📊 Sample Data Summary:`);
    const monthGroups = {};
    sampleData.forEach(record => {
      const monthKey = `${record.year}-${String(record.month).padStart(2, '0')}`;
      if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
      monthGroups[monthKey].push(record);
    });

    Object.keys(monthGroups).sort().reverse().forEach(monthKey => {
      const records = monthGroups[monthKey];
      const ranked = records.filter(r => r.rank).length;
      const avgRank = ranked > 0 
        ? (records.filter(r => r.rank).reduce((sum, r) => sum + r.rank, 0) / ranked).toFixed(1)
        : 'N/A';
      console.log(`   ${monthKey}: ${ranked}/${records.length} ranked, Avg: ${avgRank}`);
    });

    console.log(`\n✅ Sample data created successfully!`);
    console.log(`\nYou can now test the monthly comparison at:`);
    console.log(`GET /api/keyword-planner/monthly-comparison?domain=${domain}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addSampleData();
