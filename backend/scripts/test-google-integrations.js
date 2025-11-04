/**
 * Test Google Integrations Setup
 * Run this script to verify GA4, GSC, and GBP access is configured correctly
 * 
 * Usage: node scripts/test-google-integrations.js <clientId> <ga4PropertyId> <gscSiteUrl>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client.model');
const ga4Service = require('../services/google/ga4.service');
const gscService = require('../services/google/gsc.service');

async function testIntegrations() {
  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get command line arguments
    const clientId = process.argv[2];
    const ga4PropertyId = process.argv[3];
    const gscSiteUrl = process.argv[4];

    if (!clientId || !ga4PropertyId || !gscSiteUrl) {
      console.log('Usage: node scripts/test-google-integrations.js <clientId> <ga4PropertyId> <gscSiteUrl>');
      console.log('Example: node scripts/test-google-integrations.js 507f1f77bcf86cd799439011 123456789 https://example.com');
      process.exit(1);
    }

    console.log('🔍 Configuration:');
    console.log(`   Client ID: ${clientId}`);
    console.log(`   GA4 Property ID: ${ga4PropertyId}`);
    console.log(`   GSC Site URL: ${gscSiteUrl}\n`);

    // Test 1: Check service account file
    console.log('📄 Test 1: Service Account File');
    const fs = require('fs');
    const path = require('path');
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './config/google-service-account.json';
    const fullPath = path.resolve(__dirname, '..', credPath);
    
    if (fs.existsSync(fullPath)) {
      const credentials = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      console.log(`   ✅ File found: ${fullPath}`);
      console.log(`   📧 Service Account Email: ${credentials.client_email}\n`);
    } else {
      console.log(`   ❌ File not found: ${fullPath}`);
      console.log(`   💡 Download from Google Cloud Console and place at backend/config/google-service-account.json\n`);
      process.exit(1);
    }

    // Test 2: Update client with integration settings
    console.log('📝 Test 2: Updating Client Integration Settings');
    const client = await Client.findById(clientId);
    if (!client) {
      console.log(`   ❌ Client not found with ID: ${clientId}\n`);
      process.exit(1);
    }

    client.integrations = {
      ...client.integrations,
      ga4PropertyId,
      gscSiteUrl,
      googleAnalytics: true,
      googleSearchConsole: true
    };
    await client.save();
    console.log(`   ✅ Updated client: ${client.name}\n`);

    // Test 3: GA4 Access
    console.log('📊 Test 3: Google Analytics 4 Access');
    try {
      const ga4Data = await ga4Service.getOverview(ga4PropertyId);
      console.log('   ✅ GA4 access successful!');
      console.log('   📈 Metrics returned:');
      if (ga4Data.metrics && ga4Data.metrics.length > 0) {
        ga4Data.metrics.forEach(metric => {
          console.log(`      - ${metric.name}: ${metric.value}`);
        });
      }
      console.log('');
    } catch (error) {
      console.log('   ❌ GA4 access failed:');
      console.log(`      ${error.message}`);
      console.log('   💡 Make sure:');
      console.log(`      1. Service account email is added to GA4 property (Viewer role)`);
      console.log(`      2. Property ID is correct: ${ga4PropertyId}`);
      console.log('');
    }

    // Test 4: GSC Access
    console.log('🔍 Test 4: Google Search Console Access');
    try {
      const gscData = await gscService.getTopQueries(gscSiteUrl);
      console.log('   ✅ GSC access successful!');
      console.log(`   📊 Found ${gscData.queries ? gscData.queries.length : 0} queries`);
      if (gscData.queries && gscData.queries.length > 0) {
        console.log('   🔝 Top 5 queries:');
        gscData.queries.slice(0, 5).forEach((query, i) => {
          console.log(`      ${i + 1}. "${query.keys[0]}" - ${query.clicks} clicks, ${query.impressions} impressions`);
        });
      }
      console.log('');
    } catch (error) {
      console.log('   ❌ GSC access failed:');
      console.log(`      ${error.message}`);
      console.log('   💡 Make sure:');
      console.log(`      1. Service account email is added to GSC property (Full/Owner)`);
      console.log(`      2. Site URL matches exactly: ${gscSiteUrl}`);
      console.log('      3. Property has data in the last 30 days');
      console.log('');
    }

    // Test 5: Environment Variables
    console.log('⚙️  Test 5: Environment Variables');
    const requiredVars = [
      'MONGODB_URI',
      'GOOGLE_APPLICATION_CREDENTIALS',
      'GOOGLE_OAUTH_CLIENT_ID',
      'GOOGLE_OAUTH_CLIENT_SECRET',
      'GOOGLE_OAUTH_REDIRECT_URI'
    ];

    let allVarsSet = true;
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`   ✅ ${varName} is set`);
      } else {
        console.log(`   ❌ ${varName} is NOT set`);
        allVarsSet = false;
      }
    });
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📋 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Client: ${client.name}`);
    console.log(`GA4 Property ID: ${ga4PropertyId}`);
    console.log(`GSC Site URL: ${gscSiteUrl}`);
    console.log('');
    console.log('Next Steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend: cd ../frontend && npm run dev');
    console.log('3. Navigate to: http://localhost:3000/analytics');
    console.log('4. Select your client and view the data!');
    console.log('═══════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testIntegrations();
