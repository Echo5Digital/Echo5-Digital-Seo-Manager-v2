require('dotenv').config();
const mongoose = require('mongoose');

const rankHistorySchema = new mongoose.Schema({
  domain: String,
  keyword: String,
  rank: Number,
  inTop100: Boolean,
  difficulty: Number,
  location: String,
  locationCode: Number,
  source: String,
  checkedAt: Date,
  month: Number,
  year: Number,
  previousRank: Number,
  rankChange: Number,
  client: mongoose.Schema.Types.ObjectId,
  keywordId: mongoose.Schema.Types.ObjectId
}, {
  timestamps: true,
  strict: false
});

const RankHistory = mongoose.model('RankHistory', rankHistorySchema);

async function migrateRankHistoryDates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Count total records
    const totalRecords = await RankHistory.countDocuments({});
    console.log(`📊 Total RankHistory records: ${totalRecords}`);

    // Count records without month/year
    const recordsWithoutDate = await RankHistory.countDocuments({
      $or: [
        { month: { $exists: false } },
        { year: { $exists: false } }
      ]
    });
    console.log(`⚠️  Records without month/year: ${recordsWithoutDate}`);

    if (recordsWithoutDate === 0) {
      console.log('✅ All records already have month/year fields');
      process.exit(0);
    }

    // Get all records that need migration
    const recordsToMigrate = await RankHistory.find({
      $or: [
        { month: { $exists: false } },
        { year: { $exists: false } }
      ]
    });

    console.log(`\n🔧 Migrating ${recordsToMigrate.length} records...`);

    let updated = 0;
    let failed = 0;

    for (const record of recordsToMigrate) {
      try {
        const date = new Date(record.checkedAt || record.createdAt || Date.now());
        const month = date.getMonth() + 1; // 1-12
        const year = date.getFullYear();

        await RankHistory.updateOne(
          { _id: record._id },
          {
            $set: {
              month,
              year
            }
          }
        );

        updated++;
        if (updated % 100 === 0) {
          console.log(`   ✓ Updated ${updated}/${recordsToMigrate.length} records...`);
        }
      } catch (err) {
        console.error(`   ✗ Failed to update record ${record._id}:`, err.message);
        failed++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   ✓ Updated: ${updated}`);
    console.log(`   ✗ Failed: ${failed}`);

    // Verify the migration
    const remainingWithoutDate = await RankHistory.countDocuments({
      $or: [
        { month: { $exists: false } },
        { year: { $exists: false } }
      ]
    });

    console.log(`\n📊 Verification:`);
    console.log(`   Records still missing month/year: ${remainingWithoutDate}`);

    // Show sample of migrated records
    const sampleRecords = await RankHistory.find({ month: { $exists: true } })
      .limit(5)
      .select('keyword domain month year checkedAt');
    
    console.log(`\n📝 Sample migrated records:`);
    sampleRecords.forEach(record => {
      console.log(`   ${record.keyword} @ ${record.domain} -> ${record.year}-${String(record.month).padStart(2, '0')}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateRankHistoryDates();
