const axios = require('axios');

/**
 * WordPress Plugin Tester
 * Tests the Echo5 SEO Exporter plugin to verify it's working correctly
 */

// Configuration
const TEST_SITE_URL = 'https://your-wordpress-site.com'; // Change this
const API_KEY = 'your_api_key_here'; // Get from WordPress Settings > Echo5 SEO Exporter

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

function getApiUrl(endpoint) {
  const cleanUrl = TEST_SITE_URL.replace(/\/$/, '');
  return `${cleanUrl}/wp-json/echo5-seo/v1${endpoint}`;
}

async function testEndpoint(name, endpoint, method = 'GET', expectedStatus = 200) {
  try {
    log(`\n🔍 Testing: ${name}`, 'cyan');
    log(`   Endpoint: ${endpoint}`, 'blue');
    
    const response = await axios({
      method,
      url: getApiUrl(endpoint),
      headers: {
        'X-API-Key': API_KEY
      },
      timeout: 15000,
      validateStatus: () => true // Accept any status
    });
    
    const status = response.status;
    const success = response.data?.success;
    
    if (status === expectedStatus && success) {
      log(`   ✅ PASS - Status: ${status}`, 'green');
      return { passed: true, response: response.data };
    } else if (status === 404) {
      log(`   ❌ FAIL - Plugin not found (404)`, 'red');
      log(`   💡 Plugin may not be installed or activated`, 'yellow');
      return { passed: false, error: 'Plugin not found' };
    } else if (status === 401 || status === 403) {
      log(`   ❌ FAIL - Authentication failed (${status})`, 'red');
      log(`   💡 Check your API key`, 'yellow');
      return { passed: false, error: 'Invalid API key' };
    } else {
      log(`   ❌ FAIL - Unexpected status: ${status}`, 'red');
      return { passed: false, error: response.data };
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      log(`   ❌ FAIL - Site not found`, 'red');
      log(`   💡 Check the site URL: ${TEST_SITE_URL}`, 'yellow');
    } else if (error.code === 'ECONNREFUSED') {
      log(`   ❌ FAIL - Connection refused`, 'red');
      log(`   💡 Site may be down`, 'yellow');
    } else if (error.code === 'ETIMEDOUT') {
      log(`   ❌ FAIL - Request timeout`, 'red');
      log(`   💡 Site may be slow or blocking requests`, 'yellow');
    } else {
      log(`   ❌ FAIL - ${error.message}`, 'red');
    }
    return { passed: false, error: error.message };
  }
}

async function runTests() {
  log('\n═══════════════════════════════════════════════', 'cyan');
  log('   Echo5 SEO Exporter Plugin - Test Suite', 'cyan');
  log('═══════════════════════════════════════════════\n', 'cyan');
  
  log(`📍 Testing Site: ${TEST_SITE_URL}`, 'blue');
  log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`, 'blue');
  
  const tests = [
    {
      name: 'Health Check',
      endpoint: '/health',
      critical: true
    },
    {
      name: 'Get All Content',
      endpoint: '/content/all?per_page=5',
      critical: true
    },
    {
      name: 'Get Pages',
      endpoint: '/pages?per_page=5',
      critical: false
    },
    {
      name: 'Get Posts',
      endpoint: '/posts?per_page=5',
      critical: false
    },
    {
      name: 'Get Site Structure',
      endpoint: '/structure',
      critical: false
    },
    {
      name: 'Get SEO Plugins Info',
      endpoint: '/seo-plugins',
      critical: false
    },
    {
      name: 'Get Internal Links',
      endpoint: '/links/internal',
      critical: false
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.endpoint);
    results.push({
      ...test,
      ...result
    });
    
    // Show sample data for successful tests
    if (result.passed && result.response) {
      const data = result.response.data;
      if (Array.isArray(data) && data.length > 0) {
        log(`   📊 Found ${data.length} items`, 'green');
        if (data[0].title) {
          log(`   📄 Sample: "${data[0].title}"`, 'green');
        }
      } else if (test.name === 'Health Check') {
        log(`   📊 Version: ${result.response.version}`, 'green');
        log(`   📊 WP Version: ${result.response.wordpress_version}`, 'green');
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  log('\n═══════════════════════════════════════════════', 'cyan');
  log('   Test Summary', 'cyan');
  log('═══════════════════════════════════════════════\n', 'cyan');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFailed = results.filter(r => !r.passed && r.critical).length;
  
  log(`Total Tests: ${results.length}`, 'blue');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  if (criticalFailed > 0) {
    log(`\n⚠️  ${criticalFailed} CRITICAL TEST(S) FAILED`, 'red');
    log('The plugin is NOT working correctly.', 'red');
    log('\nTroubleshooting:', 'yellow');
    log('1. Verify the plugin is installed and activated', 'yellow');
    log('2. Check the API key in WordPress Settings > Echo5 SEO Exporter', 'yellow');
    log('3. Ensure the site URL is correct', 'yellow');
    log('4. Verify WordPress REST API is enabled', 'yellow');
  } else if (failed === 0) {
    log('\n🎉 ALL TESTS PASSED!', 'green');
    log('The plugin is working perfectly.', 'green');
  } else {
    log('\n✅ Core functionality working', 'green');
    log(`⚠️  ${failed} optional feature(s) failed`, 'yellow');
  }
  
  log('\n═══════════════════════════════════════════════\n', 'cyan');
  
  // Detailed failure report
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    log('Failed Tests Details:', 'yellow');
    failures.forEach(f => {
      log(`\n❌ ${f.name}`, 'red');
      log(`   Endpoint: ${f.endpoint}`, 'blue');
      log(`   Error: ${f.error}`, 'yellow');
    });
    log('\n');
  }
}

// Check if configuration is set
if (TEST_SITE_URL === 'https://your-wordpress-site.com') {
  log('\n⚠️  Configuration Required', 'yellow');
  log('\nPlease update the configuration at the top of this file:', 'yellow');
  log('1. Set TEST_SITE_URL to your WordPress site URL', 'cyan');
  log('2. Set API_KEY from WordPress Settings > Echo5 SEO Exporter', 'cyan');
  log('\nExample:', 'blue');
  log('const TEST_SITE_URL = "https://mysite.com";', 'green');
  log('const API_KEY = "echo5_abc123...";', 'green');
  log('\n');
  process.exit(1);
}

if (!API_KEY || API_KEY === 'your_api_key_here') {
  log('\n⚠️  API Key Required', 'yellow');
  log('\nPlease set the API_KEY variable:', 'yellow');
  log('1. Go to your WordPress admin', 'cyan');
  log('2. Navigate to Settings > Echo5 SEO Exporter', 'cyan');
  log('3. Copy the API key', 'cyan');
  log('4. Update the API_KEY constant in this file', 'cyan');
  log('\n');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Fatal Error: ${error.message}`, 'red');
  process.exit(1);
});
