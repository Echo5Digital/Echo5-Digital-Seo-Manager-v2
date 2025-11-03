require('dotenv').config();
const axios = require('axios');

async function testMonthlyComparison() {
  try {
    console.log('🧪 Testing Monthly Comparison API\n');

    // You'll need to get a valid JWT token first
    // For now, let's test different domain queries
    
    const testCases = [
      { domain: 'vipgts.com', label: 'Exact domain: vipgts.com' },
      { domain: 'vipgts', label: 'Partial domain: vipgts' },
      { domain: 'vip', label: 'Short partial: vip' },
    ];

    console.log('Testing different domain queries:\n');
    
    for (const testCase of testCases) {
      console.log(`📊 ${testCase.label}`);
      console.log(`   Query: domain=${testCase.domain}`);
      
      // Simulating the regex query
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI);
      
      const RankHistory = require('../models/RankHistory.model');
      
      const query = { domain: { $regex: testCase.domain, $options: 'i' } };
      const count = await RankHistory.countDocuments(query);
      
      console.log(`   Results: ${count} records found\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testMonthlyComparison();
