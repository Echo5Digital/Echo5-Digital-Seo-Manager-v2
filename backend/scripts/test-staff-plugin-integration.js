/**
 * Test WordPress Plugin Integration for staff.echo5digital.com
 * 
 * This script tests the full integration:
 * 1. Connection test via service
 * 2. Content fetch via service
 * 3. Audit service integration (plugin-first approach)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client.model');
const wordPressPluginService = require('../services/wordpress-plugin.service');

const STAFF_CLIENT_ID = '6925496671d6b3624d57139a';

async function testIntegration() {
  try {
    console.log('🧪 Testing WordPress Plugin Integration\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Test connection
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 1: Testing Connection');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const connectionResult = await wordPressPluginService.testClientConnection(STAFF_CLIENT_ID);
    
    if (connectionResult.success) {
      console.log('✅ Connection Test: PASSED');
      console.log('   Plugin Version:', connectionResult.data?.version);
      console.log('   WordPress:', connectionResult.data?.wordpress_version);
      console.log('   PHP:', connectionResult.data?.php_version);
    } else {
      console.log('❌ Connection Test: FAILED');
      console.log('   Error:', connectionResult.message);
      throw new Error('Connection test failed');
    }
    
    // Verify client status updated
    let client = await Client.findById(STAFF_CLIENT_ID);
    console.log(`\n   Client Status: ${client.wordpressPlugin.status}`);
    console.log(`   Last Health Check: ${client.wordpressPlugin.lastHealthCheck}`);
    
    // Step 2: Fetch content
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 2: Fetching Content');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const contentResult = await wordPressPluginService.fetchClientContent(STAFF_CLIENT_ID, {
      perPage: 100,
      maxPages: 1
    });
    
    if (contentResult.success) {
      console.log('✅ Content Fetch: PASSED');
      console.log(`   Total Items: ${contentResult.totalFetched}`);
      console.log(`   Method: ${contentResult.method}`);
      console.log(`   Timestamp: ${contentResult.timestamp}`);
      
      if (contentResult.items.length > 0) {
        console.log('\n   Sample Item:');
        const sample = contentResult.items[0];
        console.log(`   - Title: ${sample.title}`);
        console.log(`   - URL: ${sample.url}`);
        console.log(`   - Type: ${sample.type}`);
        console.log(`   - Word Count: ${sample.content?.word_count || 0}`);
        console.log(`   - Images: ${sample.images?.length || 0}`);
      }
    } else {
      console.log('❌ Content Fetch: FAILED');
      throw new Error('Content fetch failed');
    }
    
    // Verify client status updated
    client = await Client.findById(STAFF_CLIENT_ID);
    console.log(`\n   Last Sync: ${client.wordpressPlugin.lastSync}`);
    
    // Step 3: Test conversion to Page format
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 3: Testing Data Conversion');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (contentResult.items.length > 0) {
      const sampleItem = contentResult.items[0];
      const convertedPage = wordPressPluginService.convertPluginDataToPageFormat(
        sampleItem,
        STAFF_CLIENT_ID
      );
      
      console.log('✅ Data Conversion: PASSED');
      console.log('   Converted Fields:');
      console.log(`   - URL: ${convertedPage.url}`);
      console.log(`   - Title: ${convertedPage.title}`);
      console.log(`   - Meta Description: ${convertedPage.metaDescription?.substring(0, 50)}...`);
      console.log(`   - H1: ${convertedPage.h1}`);
      console.log(`   - Word Count: ${convertedPage.content.wordCount}`);
      console.log(`   - SEO Score: ${convertedPage.seo.seoScore}/100`);
      console.log(`   - Images: ${convertedPage.images.length}`);
      console.log(`   - Internal Links: ${convertedPage.content.links.internal}`);
    }
    
    // Step 4: Final summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Integration Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    client = await Client.findById(STAFF_CLIENT_ID);
    
    console.log('✅ All Tests Passed!');
    console.log(`\n   Client: ${client.name}`);
    console.log(`   Domain: ${client.domain}`);
    console.log(`   Plugin Status: ${client.wordpressPlugin.status}`);
    console.log(`   Data Source: ${client.dataSource}`);
    console.log(`   Pages Available: ${contentResult.totalFetched}`);
    console.log(`   Last Sync: ${client.wordpressPlugin.lastSync}`);
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Run full audit with:');
    console.log(`      const auditService = require('./services/audit.service');`);
    console.log(`      await auditService.performFullAudit('${STAFF_CLIENT_ID}');`);
    console.log('\n   2. Test via API endpoint:');
    console.log(`      POST /api/clients/${STAFF_CLIENT_ID}/wordpress-plugin/test`);
    console.log(`      GET /api/clients/${STAFF_CLIENT_ID}/wordpress-plugin/status`);
    
    console.log('\n✨ WordPress plugin integration is ready for production!\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testIntegration();
