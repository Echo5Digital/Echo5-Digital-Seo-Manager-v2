const mongoose = require('mongoose');
const Audit = require('../models/Audit.model');
const Client = require('../models/Client.model');

require('dotenv').config();

async function cleanupOldAudits() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/seo-ops-test');
    console.log('✅ Connected to MongoDB');

    // Get all clients
    const clients = await Client.find();
    console.log(`📋 Found ${clients.length} clients`);

    let totalDeleted = 0;

    for (const client of clients) {
      // Get all audits for this client, sorted by newest first
      const audits = await Audit.find({ clientId: client._id })
        .sort('-createdAt');

      if (audits.length > 1) {
        // Keep only the first (newest) one, delete the rest
        const toDelete = audits.slice(1);
        const deleteIds = toDelete.map(a => a._id);
        
        await Audit.deleteMany({ _id: { $in: deleteIds } });
        
        console.log(`🗑️  Client "${client.name}": Deleted ${toDelete.length} old audits, kept 1 latest`);
        totalDeleted += toDelete.length;
      } else if (audits.length === 1) {
        console.log(`✓  Client "${client.name}": Has 1 audit (no cleanup needed)`);
      } else {
        console.log(`-  Client "${client.name}": No audits found`);
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} old audits total.`);
    
    // Show storage stats
    const stats = await mongoose.connection.db.stats();
    console.log(`💾 Database size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupOldAudits();
