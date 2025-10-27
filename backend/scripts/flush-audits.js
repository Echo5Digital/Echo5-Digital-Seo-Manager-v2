const mongoose = require('mongoose');
const Audit = require('../models/Audit.model');
const Page = require('../models/Page.model');

// MongoDB URI - update this with your connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/seo-management';

/**
 * Flush all audit and page data from database
 */
async function flushAuditData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🗑️  Starting data flush...\n');

    // Delete all audits
    const auditResult = await Audit.deleteMany({});
    console.log(`✅ Deleted ${auditResult.deletedCount} audit records`);

    // Delete all pages
    const pageResult = await Page.deleteMany({});
    console.log(`✅ Deleted ${pageResult.deletedCount} page records`);

    console.log('\n🎉 All audit data flushed successfully!\n');
    console.log('Summary:');
    console.log(`- Audits removed: ${auditResult.deletedCount}`);
    console.log(`- Pages removed: ${pageResult.deletedCount}`);
    console.log(`- Total records deleted: ${auditResult.deletedCount + pageResult.deletedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error flushing audit data:', error);
    process.exit(1);
  }
}

// Run the flush
flushAuditData();
