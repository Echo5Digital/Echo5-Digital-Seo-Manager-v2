const mongoose = require('mongoose');
require('dotenv').config();

const Page = require('../models/Page.model');

async function clearAllPages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Deleting all pages...');
    const result = await Page.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} pages`);

    console.log('✅ All page data cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAllPages();
