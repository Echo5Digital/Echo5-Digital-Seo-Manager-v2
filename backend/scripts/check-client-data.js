require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

async function checkClientData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all clients
    const Client = mongoose.model('Client', new mongoose.Schema({}, {strict: false}));
    const clients = await Client.find({}).select('name website');
    
    console.log('📋 Clients in database:');
    if (clients.length === 0) {
      console.log('  ⚠️  No clients found');
    } else {
      clients.forEach(c => console.log(`  - ${c.name} | ${c.website} | ID: ${c._id}`));
    }

    // Check RankHistory client references
    const RankHistory = require(path.join(__dirname, '../models/RankHistory.model'));
    const withClient = await RankHistory.countDocuments({ client: { $ne: null } });
    const withoutClient = await RankHistory.countDocuments({ client: null });
    
    console.log('\n📊 RankHistory records:');
    console.log(`  With client reference: ${withClient}`);
    console.log(`  Without client reference: ${withoutClient}`);

    // If there are clients, show which domains are associated
    if (clients.length > 0) {
      console.log('\n🔗 Checking if we can link vipgts.com to a client...');
      const vipClient = clients.find(c => 
        c.website && c.website.toLowerCase().includes('vipgts')
      );
      
      if (vipClient) {
        console.log(`  ✅ Found client: ${vipClient.name} (${vipClient.website})`);
        console.log(`     Client ID: ${vipClient._id}`);
        
        // Check if rank history has this client
        const rankCount = await RankHistory.countDocuments({ client: vipClient._id });
        console.log(`     RankHistory records with this client: ${rankCount}`);
        
        if (rankCount === 0) {
          console.log('\n  💡 Suggestion: Link existing vipgts.com rank history to this client');
        }
      } else {
        console.log('  ⚠️  No client found matching vipgts.com');
        console.log('     You may need to create a client for this domain');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkClientData();
