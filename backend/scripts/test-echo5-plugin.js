const axios = require('axios');

const TEST_SITE_URL = 'https://staff.echo5digital.com';
const API_KEY = process.env.ECHO5_STAFF_API_KEY || 'YOUR_API_KEY_HERE';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testPlugin() {
  log('\n🧪 Testing Echo5 SEO Exporter Plugin', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
  
  log(`📍 Site: ${TEST_SITE_URL}`, 'blue');
  log(`🔑 API Key: ${API_KEY === 'YOUR_API_KEY_HERE' ? '❌ NOT SET' : API_KEY.substring(0, 20) + '...'}`, 'blue');
  
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    log('\n❌ Please provide API key:', 'red');
    log('   1. Go to WordPress: Settings > Echo5 SEO Exporter', 'yellow');
    log('   2. Copy the API key', 'yellow');
    log('   3. Run: ECHO5_STAFF_API_KEY="your_key" node scripts/test-echo5-plugin.js', 'yellow');
    log('\n');
    process.exit(1);
  }
  
  const baseUrl = `${TEST_SITE_URL}/wp-json/echo5-seo/v1`;
  
  // Test 1: Health Check
  log('\n1️⃣  Testing Health Check...', 'cyan');
  try {
    const health = await axios.get(`${baseUrl}/health`, {
      headers: { 'X-API-Key': API_KEY },
      timeout: 10000
    });
    
    if (health.data.success) {
      log('   ✅ Plugin is active and responding!', 'green');
      log(`   📦 Version: ${health.data.version}`, 'green');
      log(`   🌐 WordPress: ${health.data.wordpress_version}`, 'green');
      log(`   🐘 PHP: ${health.data.php_version}`, 'green');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      log('   ❌ Plugin not found - Is it activated?', 'red');
      return;
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      log('   ❌ Invalid API key', 'red');
      return;
    } else {
      log(`   ❌ Error: ${error.message}`, 'red');
      return;
    }
  }
  
  // Test 2: Get Content
  log('\n2️⃣  Testing Content Fetch...', 'cyan');
  try {
    const content = await axios.get(`${baseUrl}/content/all`, {
      headers: { 'X-API-Key': API_KEY },
      params: { per_page: 5 },
      timeout: 15000
    });
    
    if (content.data.success) {
      const items = content.data.data || [];
      const pagination = content.data.pagination;
      
      log(`   ✅ Successfully fetched content!`, 'green');
      log(`   📊 Total items in DB: ${pagination.total}`, 'green');
      log(`   📄 Items in response: ${items.length}`, 'green');
      
      if (items.length > 0) {
        log(`\n   Sample Page:`, 'blue');
        const sample = items[0];
        log(`   • Title: "${sample.title}"`, 'green');
        log(`   • URL: ${sample.url}`, 'green');
        log(`   • Type: ${sample.type}`, 'green');
        log(`   • Word Count: ${sample.content?.word_count || 0}`, 'green');
        log(`   • Images: ${sample.images?.length || 0}`, 'green');
        log(`   • Internal Links: ${sample.links?.internal_count || 0}`, 'green');
        
        if (sample.seo?.meta_title) {
          log(`   • Meta Title: "${sample.seo.meta_title}"`, 'green');
        }
      }
    }
  } catch (error) {
    log(`   ❌ Content fetch failed: ${error.message}`, 'red');
  }
  
  // Test 3: SEO Plugins
  log('\n3️⃣  Checking SEO Plugins...', 'cyan');
  try {
    const plugins = await axios.get(`${baseUrl}/seo-plugins`, {
      headers: { 'X-API-Key': API_KEY },
      timeout: 10000
    });
    
    if (plugins.data.success) {
      const active = plugins.data.data.active_plugins;
      if (Object.keys(active).length > 0) {
        log(`   ✅ SEO Plugins Detected:`, 'green');
        Object.entries(active).forEach(([name, version]) => {
          log(`   • ${name}: ${version}`, 'green');
        });
      } else {
        log(`   ⚠️  No SEO plugins detected (Yoast/RankMath/AIOSEO)`, 'yellow');
      }
    }
  } catch (error) {
    log(`   ⚠️  Could not check SEO plugins`, 'yellow');
  }
  
  // Summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('🎉 Plugin Test Complete!', 'green');
  log('\n✅ Next Steps:', 'green');
  log('   1. Add API key to Client record in MongoDB', 'cyan');
  log('   2. Test full audit with plugin integration', 'cyan');
  log('   3. Compare speed vs web scraping', 'cyan');
  log('\n');
}

testPlugin().catch(error => {
  log(`\n💥 Fatal Error: ${error.message}`, 'red');
  process.exit(1);
});
