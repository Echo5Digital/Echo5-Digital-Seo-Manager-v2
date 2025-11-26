/**
 * Backfill Content Blocks for Existing Pages
 * 
 * This script fetches content blocks for all pages that don't have them.
 * Run this once after updating the audit service to auto-capture content.
 * 
 * Usage: node scripts/backfill-page-content.js [--client=clientId] [--limit=50]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const Page = require('../models/Page.model');
const Client = require('../models/Client.model');

// Parse CLI arguments
const args = process.argv.slice(2);
const clientArg = args.find(a => a.startsWith('--client='));
const limitArg = args.find(a => a.startsWith('--limit='));
const clientId = clientArg ? clientArg.split('=')[1] : null;
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

let uaIndex = 0;
const getUA = () => USER_AGENTS[uaIndex++ % USER_AGENTS.length];

// Delay helper
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Extract content blocks from HTML
 */
function extractContentBlocks(html, url) {
  const $ = cheerio.load(html);
  
  // Remove non-content elements
  $('script, style, noscript, iframe, svg, nav, header, footer, aside').remove();
  
  // Find main content area
  let $content = $('main, [role="main"], article, .content, #content, .main-content, .post-content, .entry-content');
  if ($content.length === 0) {
    $content = $('body');
  }
  
  // Extract blocks
  const blocks = [];
  $content.find('h1, h2, h3, h4, h5, h6, p').each((i, el) => {
    if (blocks.length >= 50) return false;
    const tag = el.tagName?.toLowerCase() || 'p';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && text.length >= 10) {
      blocks.push({ tag, text });
    }
  });
  
  // Fallback to divs if no blocks
  if (blocks.length === 0) {
    $content.find('div, section, li').each((i, el) => {
      if (blocks.length >= 50) return false;
      const text = $(el).clone().children().remove().end().text().replace(/\s+/g, ' ').trim();
      if (text && text.length >= 15) {
        blocks.push({ tag: 'div', text });
      }
    });
  }
  
  // Extract internal links
  const internalLinks = [];
  const pageHost = (() => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, '') } catch { return '' } })();
  
  $content.find('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    const anchorText = $(el).text().replace(/\s+/g, ' ').trim();
    const rel = $(el).attr('rel') || '';
    if (!href || !anchorText) return;
    
    try {
      const absoluteUrl = new URL(href, url).href;
      const linkHost = new URL(absoluteUrl).hostname.toLowerCase().replace(/^www\./, '');
      if (linkHost === pageHost && !absoluteUrl.includes('#') && internalLinks.length < 100) {
        internalLinks.push({
          url: absoluteUrl,
          anchorText: anchorText.substring(0, 200),
          isNofollow: rel.includes('nofollow')
        });
      }
    } catch {}
  });
  
  // Get sample text
  const bodyText = $content.text().replace(/\s+/g, ' ').trim();
  const sampleText = (blocks.map(b => b.text).join(' ').trim() || bodyText).substring(0, 2000);
  const wordCount = sampleText.split(/\s+/).filter(Boolean).length;
  
  return { blocks, internalLinks, sampleText, wordCount };
}

/**
 * Fetch and update a single page
 */
async function updatePage(page) {
  try {
    console.log(`  📄 Fetching: ${page.url}`);
    
    const response = await axios.get(page.url, {
      timeout: 20000,
      headers: {
        'User-Agent': getUA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      validateStatus: () => true,
      maxRedirects: 5
    });
    
    if (response.status >= 400) {
      console.log(`  ⚠️ HTTP ${response.status} - skipping`);
      return { success: false, reason: `HTTP ${response.status}` };
    }
    
    const { blocks, internalLinks, sampleText, wordCount } = extractContentBlocks(response.data, page.url);
    
    if (blocks.length === 0) {
      console.log(`  ⚠️ No content blocks extracted`);
      return { success: false, reason: 'No blocks found' };
    }
    
    // Update the page
    await Page.findByIdAndUpdate(page._id, {
      $set: {
        'content.blocks': blocks,
        'content.internalLinks': internalLinks,
        'content.sample': sampleText,
        'content.wordCount': wordCount,
        'content.readingTime': Math.max(1, Math.round(wordCount / 200))
      }
    });
    
    console.log(`  ✅ Updated: ${blocks.length} blocks, ${internalLinks.length} links`);
    return { success: true, blocks: blocks.length, links: internalLinks.length };
    
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n🔧 Page Content Backfill Script\n');
  
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
  
  // Build query for pages without blocks
  const query = {
    $or: [
      { 'content.blocks': { $exists: false } },
      { 'content.blocks': { $size: 0 } },
      { 'content.blocks': null }
    ]
  };
  
  if (clientId) {
    query.clientId = clientId;
    const client = await Client.findById(clientId);
    console.log(`📌 Filtering by client: ${client?.name || clientId}\n`);
  }
  
  // Find pages needing update
  const pages = await Page.find(query).limit(limit).sort({ updatedAt: -1 });
  
  console.log(`📊 Found ${pages.length} pages without content blocks\n`);
  
  if (pages.length === 0) {
    console.log('✅ All pages already have content blocks!');
    await mongoose.disconnect();
    return;
  }
  
  // Process pages
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`\n[${i + 1}/${pages.length}] Processing: ${page.slug}`);
    
    const result = await updatePage(page);
    if (result.success) {
      success++;
    } else {
      failed++;
    }
    
    // Rate limiting - wait 1-2 seconds between requests
    if (i < pages.length - 1) {
      await delay(1000 + Math.random() * 1000);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 BACKFILL COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Success: ${success} pages`);
  console.log(`❌ Failed: ${failed} pages`);
  console.log('='.repeat(50) + '\n');
  
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
