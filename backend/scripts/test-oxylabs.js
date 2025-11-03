/**
 * Test Oxylabs Integration
 * 
 * This script tests the Oxylabs API integration without hitting the database.
 * Run this to verify credentials and API connectivity.
 * 
 * Usage: node scripts/test-oxylabs.js
 */

require('dotenv').config();
const oxylabsService = require('../services/oxylabs.service');

async function testOxylabs() {
  console.log('🧪 Testing Oxylabs Integration\n');
  
  // Check configuration
  console.log('1️⃣ Checking Configuration...');
  const isConfigured = oxylabsService.isConfigured();
  console.log(`   Provider configured: ${isConfigured ? '✅' : '❌'}`);
  console.log(`   Username: ${process.env.OXYLABS_USER || '❌ missing'}`);
  console.log(`   Password: ${process.env.OXYLABS_PASS ? '***set***' : '❌ missing'}\n`);
  
  if (!isConfigured) {
    console.error('❌ Oxylabs credentials not configured. Please add to .env file:');
    console.error('   OXYLABS_USER=your_username');
    console.error('   OXYLABS_PASS=your_password');
    process.exit(1);
  }
  
  // Test keyword
  const testKeyword = 'SEO services';
  const testDomain = 'example.com';
  const testLocation = 'United States';
  
  console.log('2️⃣ Testing Rank Check API...');
  console.log(`   Keyword: "${testKeyword}"`);
  console.log(`   Domain: ${testDomain}`);
  console.log(`   Location: ${testLocation}`);
  console.log(`   Checking top 20 results...\n`);
  
  try {
    const startTime = Date.now();
    
    const result = await oxylabsService.checkRank({
      keyword: testKeyword,
      domain: testDomain,
      depth: 20,
      location: oxylabsService.mapLocation(testLocation)
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ API Response Received\n');
    console.log('📊 Results:');
    console.log(`   Found: ${result.found ? '✅ Yes' : '❌ No'}`);
    console.log(`   Rank: ${result.rank || 'Not in top 20'}`);
    console.log(`   URL: ${result.url || 'N/A'}`);
    console.log(`   Total Results: ${result.totalResults || 0}`);
    console.log(`   Depth Searched: ${result.depth}`);
    console.log(`   Cost: ~$${result.cost.toFixed(4)}`);
    console.log(`   Provider: ${result.provider}`);
    console.log(`   Duration: ${duration}s\n`);
    
    // Test location mapping
    console.log('3️⃣ Testing Location Mapping...');
    const locations = [
      'United States',
      'New York',
      'United Kingdom',
      'London',
      'Canada',
      'Toronto',
      'Australia',
      'Sydney'
    ];
    
    console.log('   Mapped Locations:');
    locations.forEach(loc => {
      const mapped = oxylabsService.mapLocation(loc);
      console.log(`   - "${loc}" → "${mapped}"`);
    });
    
    console.log('\n✅ All tests passed! Oxylabs integration is working correctly.\n');
    
  } catch (error) {
    console.error('❌ Test Failed\n');
    console.error('Error Details:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Verify credentials in .env file');
    console.error('   2. Check API quota/balance');
    console.error('   3. Ensure internet connection is stable');
    console.error('   4. Try again in a few moments');
    
    process.exit(1);
  }
}

// Run test
testOxylabs().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
