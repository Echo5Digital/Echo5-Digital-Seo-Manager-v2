require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

async function relinkRealData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Client = mongoose.model('Client', new mongoose.Schema({}, {strict: false}));
    const RankHistory = require(path.join(__dirname, '../models/RankHistory.model'));

    // Find clients
    const vipClient = await Client.findOne({ website: { $regex: 'vipgts', $options: 'i' } });
    const smileClient = await Client.findOne({ website: { $regex: 'smilerite', $options: 'i' } });

    console.log('📋 Found clients:');
    if (vipClient) console.log(`  ✅ VIPGTS: ${vipClient._id}`);
    if (smileClient) console.log(`  ✅ Smilerite Dental: ${smileClient._id}`);
    console.log('');

    // Link vipgts.com records to VIPGTS client
    if (vipClient) {
      const vipResult = await RankHistory.updateMany(
        {
          domain: { $regex: 'vipgts', $options: 'i' },
          $or: [
            { client: null },
            { client: { $exists: false } }
          ]
        },
        { $set: { client: vipClient._id } }
      );
      console.log(`✅ Linked ${vipResult.modifiedCount} vipgts.com records to VIPGTS client`);
    }

    // Link smileritedental.com records to Smilerite client
    if (smileClient) {
      const smileResult = await RankHistory.updateMany(
        {
          domain: { $regex: 'smilerite', $options: 'i' },
          $or: [
            { client: null },
            { client: { $exists: false } }
          ]
        },
        { $set: { client: smileClient._id } }
      );
      console.log(`✅ Linked ${smileResult.modifiedCount} smileritedental.com records to Smilerite Dental client`);
    }

    // Show summary
    console.log('\n📊 Current database status:');
    const allRecords = await RankHistory.find({}).sort({ checkedAt: -1 });
    
    const byDomain = {};
    allRecords.forEach(record => {
      if (!byDomain[record.domain]) {
        byDomain[record.domain] = {
          total: 0,
          withClient: 0,
          keywords: new Set()
        };
      }
      byDomain[record.domain].total++;
      if (record.client) byDomain[record.domain].withClient++;
      byDomain[record.domain].keywords.add(record.keyword);
    });

    Object.keys(byDomain).forEach(domain => {
      const data = byDomain[domain];
      console.log(`\n  ${domain}:`);
      console.log(`    Total records: ${data.total}`);
      console.log(`    Linked to client: ${data.withClient}/${data.total}`);
      console.log(`    Unique keywords: ${data.keywords.size}`);
      console.log(`    Keywords: ${Array.from(data.keywords).join(', ')}`);
    });

    console.log('\n✨ Real data has been re-linked to clients!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

relinkRealData();
