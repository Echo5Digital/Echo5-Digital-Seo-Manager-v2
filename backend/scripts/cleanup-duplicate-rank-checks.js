/**
 * Clean Up Duplicate Rank Checks
 * 
 * Keeps only the latest rank check for each keyword on the same date.
 * Removes all older checks from the same day.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const RankHistory = require('../models/RankHistory.model');

async function cleanupDuplicateRankChecks() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all rank history records
    const allRecords = await RankHistory.find().sort({ checkedAt: -1 });
    console.log(`Total rank history records: ${allRecords.length}\n`);

    // Group by domain + keyword + date (year-month-day)
    const groupedByDate = {};
    
    for (const record of allRecords) {
      const date = new Date(record.checkedAt);
      const dateKey = `${record.domain}|${record.keyword}|${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(record);
    }

    // Find duplicates and mark older ones for deletion
    const toDelete = [];
    let duplicateGroups = 0;

    for (const [dateKey, records] of Object.entries(groupedByDate)) {
      if (records.length > 1) {
        duplicateGroups++;
        const [domain, keyword, date] = dateKey.split('|');
        
        // Sort by checkedAt descending (newest first)
        records.sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt));
        
        const latest = records[0];
        const older = records.slice(1); // All except the first (latest)
        
        console.log(`📅 ${date} - ${keyword} (${domain})`);
        console.log(`   ✅ Keeping: ${latest.checkedAt.toISOString()} - Rank ${latest.rank || 'N/A'}`);
        console.log(`   ❌ Removing ${older.length} older check(s):`);
        
        older.forEach(old => {
          console.log(`      - ${old.checkedAt.toISOString()} - Rank ${old.rank || 'N/A'}`);
          toDelete.push(old._id);
        });
        console.log('');
      }
    }

    // Delete the older records
    if (toDelete.length > 0) {
      console.log('='.repeat(60));
      console.log(`Found ${duplicateGroups} date(s) with duplicate rank checks`);
      console.log(`Total records to delete: ${toDelete.length}`);
      console.log('='.repeat(60));
      
      console.log('\nDeleting older records...');
      const deleteResult = await RankHistory.deleteMany({
        _id: { $in: toDelete }
      });
      
      console.log(`✅ Successfully deleted ${deleteResult.deletedCount} older rank check records`);
      
      // Show summary
      const remainingRecords = await RankHistory.countDocuments();
      console.log(`\n📊 Summary:`);
      console.log(`   Before: ${allRecords.length} records`);
      console.log(`   Deleted: ${deleteResult.deletedCount} records`);
      console.log(`   After: ${remainingRecords} records`);
    } else {
      console.log('✅ No duplicate rank checks found - database is clean!');
    }

  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run cleanup
cleanupDuplicateRankChecks();
