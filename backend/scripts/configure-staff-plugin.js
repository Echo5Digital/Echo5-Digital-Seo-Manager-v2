/**
 * Configure WordPress Plugin for staff.echo5digital.com
 * 
 * This script configures the WordPress plugin integration for the staff site
 * by encrypting and storing the API key in the Client record.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client.model');
const Encryption = require('../utils/encryption');

// Get API key from command line argument or use default
const apiKeyArg = process.argv[2];

const STAFF_SITE_CONFIG = {
  domain: 'staff.echo5digital.com',
  apiKey: apiKeyArg || 'echo5_4f607b030657553244b17823bba3aed7f436d2f9f2a52ae00c605b3b2626b399',
  siteUrl: 'https://staff.echo5digital.com'
};

async function configureStaffPlugin() {
  try {
    console.log('🔌 Configuring WordPress Plugin for staff.echo5digital.com\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find or create staff client
    let client = await Client.findOne({ domain: STAFF_SITE_CONFIG.domain });
    
    if (!client) {
      console.log('📝 Creating new client for staff.echo5digital.com...');
      client = await Client.create({
        name: 'Echo5 Digital Staff Site',
        domain: STAFF_SITE_CONFIG.domain,
        website: STAFF_SITE_CONFIG.siteUrl,
        cms: 'WordPress',
        industry: 'Digital Marketing',
        isActive: true
      });
      console.log('✅ Client created:', client._id);
    } else {
      console.log('✅ Found existing client:', client._id);
    }
    
    console.log('\n📊 Client Details:');
    console.log(`   Name: ${client.name}`);
    console.log(`   Domain: ${client.domain}`);
    console.log(`   Website: ${client.website}`);
    console.log(`   ID: ${client._id}\n`);
    
    // Test encryption
    console.log('🔐 Testing encryption...');
    const testEncrypted = Encryption.encrypt('test');
    const testDecrypted = Encryption.decrypt(testEncrypted);
    console.log('✅ Encryption test passed\n');
    
    // Encrypt API key
    console.log('🔐 Encrypting API key...');
    const encryptedApiKey = Encryption.encrypt(STAFF_SITE_CONFIG.apiKey);
    console.log('✅ API key encrypted\n');
    
    // Update client with plugin configuration
    console.log('💾 Saving plugin configuration to client...');
    await Client.updateOne(
      { _id: client._id },
      {
        'wordpressPlugin.enabled': true,
        'wordpressPlugin.apiKey': encryptedApiKey,
        'wordpressPlugin.siteUrl': STAFF_SITE_CONFIG.siteUrl,
        'wordpressPlugin.status': 'not_configured',
        'dataSource': 'auto' // Try plugin first, fallback to scraping
      }
    );
    console.log('✅ Plugin configuration saved\n');
    
    // Verify configuration
    const updatedClient = await Client.findById(client._id)
      .select('+wordpressPlugin.apiKey');
    
    console.log('✅ Verification:');
    console.log(`   Plugin Enabled: ${updatedClient.wordpressPlugin.enabled}`);
    console.log(`   Site URL: ${updatedClient.wordpressPlugin.siteUrl}`);
    console.log(`   Status: ${updatedClient.wordpressPlugin.status}`);
    console.log(`   Data Source: ${updatedClient.dataSource}`);
    console.log(`   Has API Key: ${!!updatedClient.wordpressPlugin.apiKey}\n`);
    
    // Test decryption
    console.log('🔓 Testing API key decryption...');
    const decryptedKey = Encryption.decrypt(updatedClient.wordpressPlugin.apiKey);
    const keysMatch = decryptedKey === STAFF_SITE_CONFIG.apiKey;
    console.log(`   Decrypted Key Matches: ${keysMatch ? '✅' : '❌'}\n`);
    
    if (!keysMatch) {
      throw new Error('Decrypted key does not match original!');
    }
    
    console.log('🎉 SUCCESS! WordPress plugin configured for staff.echo5digital.com\n');
    console.log('📋 Next Steps:');
    console.log('   1. Test connection: node scripts/test-staff-plugin-integration.js');
    console.log('   2. Run audit with Client ID:', client._id);
    console.log(`   3. API endpoint: POST /api/clients/${client._id}/wordpress-plugin/test\n`);
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

configureStaffPlugin();
