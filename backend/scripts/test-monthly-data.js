/**
 * Test Monthly Comparison Data
 * Check what the API returns for vipgts.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const RankHistory = require('../models/RankHistory.model');

async function testMonthlyData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Check all vipgts.com records
    const allRecords = await RankHistory.find({ 
      domain: { $regex: 'vipgts', $options: 'i' } 
    }).sort({ checkedAt: 1 });

    console.log(`📊 Total vipgts.com records: ${allRecords.length}\n`);

    // Group by month
    const monthGroups = {};
    allRecords.forEach(record => {
      const monthKey = `${record.year}-${String(record.month).padStart(2, '0')}`;
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push({
        keyword: record.keyword,
        rank: record.rank,
        date: new Date(record.checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: record.checkedAt
      });
    });

    // Display grouped data
    const months = Object.keys(monthGroups).sort();
    console.log(`📅 Months with data: ${months.join(', ')}\n`);

    months.forEach(monthKey => {
      const records = monthGroups[monthKey];
      const uniqueKeywords = [...new Set(records.map(r => r.keyword))];
      console.log(`\n${monthKey}:`);
      console.log(`  Total records: ${records.length}`);
      console.log(`  Unique keywords: ${uniqueKeywords.length}`);
      console.log(`  Checks per keyword: ${(records.length / uniqueKeywords.length).toFixed(1)}`);
      
      // Show dates for first keyword
      if (uniqueKeywords.length > 0) {
        const firstKeyword = uniqueKeywords[0];
        const keywordRecords = records.filter(r => r.keyword === firstKeyword);
        console.log(`  Example (${firstKeyword}):`);
        keywordRecords.forEach(r => {
          console.log(`    - ${r.date}: #${r.rank}`);
        });
      }
    });

    // Check October specifically
    console.log('\n\n🔍 October 2025 Details:');
    const octoberRecords = await RankHistory.find({
      domain: { $regex: 'vipgts', $options: 'i' },
      year: 2025,
      month: 10
    }).sort({ keyword: 1, checkedAt: 1 });

    console.log(`Total October records: ${octoberRecords.length}`);
    
    if (octoberRecords.length > 0) {
      const octoberKeywords = {};
      octoberRecords.forEach(r => {
        if (!octoberKeywords[r.keyword]) {
          octoberKeywords[r.keyword] = [];
        }
        octoberKeywords[r.keyword].push({
          rank: r.rank,
          date: new Date(r.checkedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        });
      });

      console.log(`\nOctober keywords: ${Object.keys(octoberKeywords).length}`);
      console.log('\nFirst 3 keywords with checks:');
      Object.keys(octoberKeywords).slice(0, 3).forEach(kw => {
        console.log(`\n  ${kw}:`);
        octoberKeywords[kw].forEach(check => {
          console.log(`    ${check.date}: #${check.rank}`);
        });
      });
    } else {
      console.log('❌ NO OCTOBER DATA FOUND!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testMonthlyData();
