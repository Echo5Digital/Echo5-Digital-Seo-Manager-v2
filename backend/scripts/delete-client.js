const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define Client model (minimal version)
const clientSchema = new mongoose.Schema({
  name: String,
  domain: String,
  contactEmail: String,
  status: String
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);

// Domain to delete
const DOMAIN_TO_DELETE = process.argv[2] || 'insightfulmindpsych.com';

async function deleteClient() {
  try {
    console.log(`🗑️  Looking for client with domain: ${DOMAIN_TO_DELETE}...`);
    
    const client = await Client.findOne({ domain: DOMAIN_TO_DELETE });
    
    if (!client) {
      console.log('⚠️  No client found with that domain.');
      await mongoose.connection.close();
      return;
    }
    
    console.log('Found client:', client);
    console.log('\n🗑️  Deleting client...');
    
    await Client.deleteOne({ domain: DOMAIN_TO_DELETE });
    
    console.log('✅ Client deleted successfully!');
    console.log('You can now create a new client with this domain.');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

deleteClient();
