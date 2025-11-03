/**
 * Quick Check VIPGTS Data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const RankHistory = require('../models/RankHistory.model');
const Client = require('../models/Client.model');

async function quickCheck() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find VIPGTS client
    const vipClient = await Client.findOne({ website: { $regex: 'vipgts', $options: 'i' } });
    console.log('\n📌 VIPGTS Client:', vipClient ? vipClient._id : 'NOT FOUND');
    
    // Count all vipgts.com records
    const totalRecords = await RankHistory.countDocuments({ 
      domain: { $regex: 'vipgts', $options: 'i' } 
    });
    console.log(`📊 Total vipgts.com records: ${totalRecords}`);
    
    // Count with client reference
    const withClient = await RankHistory.countDocuments({ 
      domain: { $regex: 'vipgts', $options: 'i' },
      client: vipClient?._id
    });
    console.log(`✅ Records with client reference: ${withClient}`);
    
    // Count without client reference
    const withoutClient = await RankHistory.countDocuments({ 
      domain: { $regex: 'vipgts', $options: 'i' },
      client: null
    });
    console.log(`⚠️  Records WITHOUT client reference: ${withoutClient}`);
    
    // Group by month-year
    const byMonth = await RankHistory.aggregate([
      { $match: { domain: { $regex: 'vipgts', $options: 'i' } } },
      { 
        $group: {
          _id: { year: '$year', month: '$month', hasClient: { $cond: [{ $eq: ['$client', null] }, 'no', 'yes'] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    console.log('\n📅 Records by Month:');
    byMonth.forEach(m => {
      console.log(`  ${m._id.year}-${String(m._id.month).padStart(2, '0')} (client: ${m._id.hasClient}): ${m.count} records`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

quickCheck();
