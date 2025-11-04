/**
 * Migration Script: Add normalized titles to existing blogs
 * Run this once to populate normalizedTitle for all existing blogs
 * 
 * Usage: node scripts/migrate-normalized-titles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/Blog.model');
const { normalizeTitle } = require('../utils/titleNormalizer');

const migrateNormalizedTitles = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    console.log('\n🔍 Fetching blogs without normalized titles...');
    const blogs = await Blog.find({
      $or: [
        { normalizedTitle: { $exists: false } },
        { normalizedTitle: null },
        { normalizedTitle: '' }
      ]
    });

    console.log(`📊 Found ${blogs.length} blogs to update`);

    if (blogs.length === 0) {
      console.log('✅ All blogs already have normalized titles!');
      process.exit(0);
    }

    let updated = 0;
    let errors = 0;

    for (const blog of blogs) {
      try {
        blog.normalizedTitle = normalizeTitle(blog.title);
        await blog.save({ validateBeforeSave: false });
        updated++;
        
        if (updated % 10 === 0) {
          console.log(`   ... updated ${updated}/${blogs.length} blogs`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error updating blog ${blog._id}:`, error.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully updated: ${updated} blogs`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors} blogs`);
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migrateNormalizedTitles();
