const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete old admin user
    const deleteResult = await mongoose.connection.db.collection('users').deleteMany({ 
      email: 'admin@echo5.com' 
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} old admin user(s)\n`);

    // Create new admin user with correct schema
    const ADMIN_USER = {
      name: 'Admin User',
      email: 'admin@echo5.com',
      password: 'Admin@123456',
      role: 'Boss',
      isActive: true
    };

    console.log('🔐 Creating new admin account...');
    console.log(`Name: ${ADMIN_USER.name}`);
    console.log(`Email: ${ADMIN_USER.email}`);
    console.log(`Password: ${ADMIN_USER.password}`);
    console.log(`Role: ${ADMIN_USER.role}\n`);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_USER.password, salt);

    // Insert user
    const result = await mongoose.connection.db.collection('users').insertOne({
      name: ADMIN_USER.name,
      email: ADMIN_USER.email,
      password: hashedPassword,
      role: ADMIN_USER.role,
      isActive: ADMIN_USER.isActive,
      assignedClients: [],
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Admin account created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`Email: ${ADMIN_USER.email}`);
    console.log(`Password: ${ADMIN_USER.password}`);
    console.log('\n🔗 Login URL: http://localhost:3000/login');
    console.log(`💡 User ID: ${result.insertedId}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

resetAdmin();
