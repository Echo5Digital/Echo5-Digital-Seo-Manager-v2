const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Client = require('../models/Client.model');

/**
 * Cleanup script to permanently delete inactive clients
 */
async function cleanupInactiveClients() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all inactive clients
    const inactiveClients = await Client.find({ isActive: false });
    
    console.log(`📊 Found ${inactiveClients.length} inactive clients:\n`);
    
    if (inactiveClients.length === 0) {
      console.log('✨ No inactive clients to clean up!');
      process.exit(0);
    }

    inactiveClients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} - ${client.domain} (ID: ${client._id})`);
    });

    console.log('\n🗑️  Permanently deleting all inactive clients...');
    
    const result = await Client.deleteMany({ isActive: false });
    
    console.log(`✅ Successfully deleted ${result.deletedCount} inactive clients`);
    console.log('✨ Cleanup complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupInactiveClients();
