const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const Audit = require('../models/Audit.model');
    const Client = require('../models/Client.model');
    
    // Find client by domain
    const client = await Client.findOne({ domain: /openarmsinitiative\.com/ });
    
    if (!client) {
      console.log('❌ No client found for openarmsinitiative.com');
      process.exit(0);
    }
    
    console.log('📊 Client found:', client.name, client._id);
    
    // Find latest audit for this client
    const audit = await Audit.findOne({ clientId: client._id })
      .sort('-createdAt')
      .select('summary status createdAt completedAt');
    
    if (!audit) {
      console.log('❌ No audit found for this client');
      process.exit(0);
    }
    
    console.log('\n📋 Audit Details:');
    console.log('Status:', audit.status);
    console.log('Created:', audit.createdAt);
    console.log('Completed:', audit.completedAt);
    console.log('\n📊 Summary:', JSON.stringify(audit.summary, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
