require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

async function linkRankHistoryToClient() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Client = mongoose.model('Client', new mongoose.Schema({}, {strict: false}));
    const RankHistory = require(path.join(__dirname, '../models/RankHistory.model'));

    // Find the VIPGTS client
    const vipClient = await Client.findOne({ website: { $regex: 'vipgts', $options: 'i' } });
    
    if (!vipClient) {
      console.log('❌ VIPGTS client not found');
      process.exit(1);
    }

    console.log(`✅ Found client: ${vipClient.name}`);
    console.log(`   Website: ${vipClient.website}`);
    console.log(`   ID: ${vipClient._id}\n`);

    // Find all vipgts.com rank history records without a client
    const vipRecords = await RankHistory.find({
      domain: { $regex: 'vipgts', $options: 'i' },
      client: null
    });

    console.log(`📊 Found ${vipRecords.length} RankHistory records for vipgts.com without client reference\n`);

    if (vipRecords.length === 0) {
      console.log('✅ No records to update');
      process.exit(0);
    }

    // Update all records to link to the client
    const result = await RankHistory.updateMany(
      {
        domain: { $regex: 'vipgts', $options: 'i' },
        client: null
      },
      {
        $set: { client: vipClient._id }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} records`);
    console.log(`   Linked to client: ${vipClient.name} (${vipClient._id})\n`);

    // Verify the update
    const updatedCount = await RankHistory.countDocuments({
      domain: { $regex: 'vipgts', $options: 'i' },
      client: vipClient._id
    });

    console.log(`📊 Verification:`);
    console.log(`   RankHistory records now linked to ${vipClient.name}: ${updatedCount}`);

    // Also link smilerite dental if it exists
    const smileClient = await Client.findOne({ website: { $regex: 'smilerite', $options: 'i' } });
    if (smileClient) {
      const smileResult = await RankHistory.updateMany(
        {
          domain: { $regex: 'smilerite', $options: 'i' },
          client: null
        },
        {
          $set: { client: smileClient._id }
        }
      );
      console.log(`\n✅ Also linked ${smileResult.modifiedCount} smileritedental.com records to ${smileClient.name}`);
    }

    console.log('\n✨ Now you can use the client dropdown in monthly comparison!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

linkRankHistoryToClient();
