/**
 * Backfill Focus Keywords Script
 * 
 * This script automatically detects and assigns focus keywords to pages
 * that don't have one set. It uses the same detection algorithm as the
 * audit service.
 * 
 * Usage:
 *   node scripts/backfill-focus-keywords.js [--client=CLIENT_ID] [--dry-run] [--limit=N]
 * 
 * Options:
 *   --client=ID   Only process pages for a specific client
 *   --dry-run     Show what would be updated without saving
 *   --limit=N     Limit to N pages (default: all)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Page = require('../models/Page.model');
const Client = require('../models/Client.model');

// Parse command line arguments
const args = process.argv.slice(2);
const clientArg = args.find(a => a.startsWith('--client='));
const clientId = clientArg ? clientArg.split('=')[1] : null;
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// Stop words for keyword detection
const stopWords = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'any', 'our', 'your', 'their', 'my', 'his', 'her', 'up',
  'down', 'out', 'off', 'over', 'under', 'also', 'get', 'got', 'new', 'best', 'top',
  'page', 'home', 'site', 'website', 'blog', 'post', 'article', 'read', 'click', 'learn'
]);

/**
 * Detect the best focus keyword for a page
 */
function detectFocusKeyword(pageData) {
  const { title = '', h1 = '', metaDescription = '', slug = '', sampleText = '' } = pageData;
  
  // Skip detection for homepage or utility pages
  if (slug === '__root__' || slug === '' || slug === '/') {
    return null;
  }
  
  const keywordCandidates = new Map();
  
  const extractKeywords = (text, weight) => {
    if (!text || typeof text !== 'string') return;
    
    const cleanText = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleanText.split(' ').filter(w => w.length > 2 && !stopWords.has(w));
    
    // Single words
    words.forEach(word => {
      if (word.length >= 3) {
        const current = keywordCandidates.get(word) || 0;
        keywordCandidates.set(word, current + weight * 0.5);
      }
    });
    
    // 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (bigram.length >= 5) {
        const current = keywordCandidates.get(bigram) || 0;
        keywordCandidates.set(bigram, current + weight);
      }
    }
    
    // 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (trigram.length >= 8 && trigram.length <= 40) {
        const current = keywordCandidates.get(trigram) || 0;
        keywordCandidates.set(trigram, current + weight * 0.8);
      }
    }
  };
  
  // Extract from URL slug
  const slugText = slug.replace(/[-_]/g, ' ').replace(/\//g, ' ');
  extractKeywords(slugText, 3);
  
  // Extract from H1
  extractKeywords(h1, 4);
  
  // Extract from title
  const cleanTitle = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim();
  extractKeywords(cleanTitle, 3.5);
  
  // Extract from meta description
  extractKeywords(metaDescription, 2);
  
  // Extract from content sample
  if (sampleText) {
    extractKeywords(sampleText.substring(0, 500), 1);
  }
  
  // Find the best keyword
  let bestKeyword = null;
  let bestScore = 0;
  
  keywordCandidates.forEach((score, keyword) => {
    const wordCount = keyword.split(' ').length;
    let adjustedScore = score;
    
    if (wordCount === 2) adjustedScore *= 1.3;
    else if (wordCount === 3) adjustedScore *= 1.1;
    else if (wordCount > 4) adjustedScore *= 0.5;
    else if (wordCount === 1) adjustedScore *= 0.7;
    
    if (keyword.length < 4) adjustedScore *= 0.3;
    else if (keyword.length > 50) adjustedScore *= 0.5;
    
    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestKeyword = keyword;
    }
  });
  
  if (bestScore >= 2 && bestKeyword) {
    return bestKeyword
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return null;
}

async function main() {
  console.log('🔑 Focus Keyword Backfill Script');
  console.log('================================\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be saved\n');
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Build query
    const query = {
      $or: [
        { 'seo.focusKeyword': { $exists: false } },
        { 'seo.focusKeyword': null },
        { 'seo.focusKeyword': '' }
      ]
    };
    
    if (clientId) {
      query.clientId = new mongoose.Types.ObjectId(clientId);
      const client = await Client.findById(clientId);
      console.log(`📁 Filtering by client: ${client?.name || clientId}\n`);
    }
    
    // Find pages without focus keywords
    let pagesQuery = Page.find(query).sort({ createdAt: -1 });
    if (limit) {
      pagesQuery = pagesQuery.limit(limit);
      console.log(`📊 Limited to ${limit} pages\n`);
    }
    
    const pages = await pagesQuery;
    console.log(`📄 Found ${pages.length} pages without focus keywords\n`);
    
    if (pages.length === 0) {
      console.log('✨ All pages already have focus keywords!');
      process.exit(0);
    }
    
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const page of pages) {
      try {
        const focusKeyword = detectFocusKeyword({
          title: page.title || '',
          h1: page.h1 || '',
          metaDescription: page.metaDescription || '',
          slug: page.slug || '',
          sampleText: page.content?.sample || ''
        });
        
        if (focusKeyword) {
          if (dryRun) {
            console.log(`  📝 ${page.slug} -> "${focusKeyword}"`);
          } else {
            page.seo = page.seo || {};
            page.seo.focusKeyword = focusKeyword;
            await page.save();
            console.log(`  ✅ ${page.slug} -> "${focusKeyword}"`);
          }
          updated++;
        } else {
          console.log(`  ⏭️  ${page.slug} -> (no keyword detected)`);
          skipped++;
        }
      } catch (err) {
        console.error(`  ❌ ${page.slug} -> Error: ${err.message}`);
        failed++;
      }
    }
    
    console.log('\n================================');
    console.log('📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    if (dryRun) {
      console.log('\n💡 Run without --dry-run to apply changes');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main();
