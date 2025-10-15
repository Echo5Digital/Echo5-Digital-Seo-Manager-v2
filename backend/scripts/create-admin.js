const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define User model (minimal version)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['Boss', 'Staff', 'Developer'] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Admin user details
const ADMIN_USER = {
  name: 'Admin User',
  email: 'admin@echo5.com',
  password: 'Admin@123456',
  role: 'Boss'
};

async function createAdmin() {
  try {
    console.log('🔐 Creating admin account...');
    console.log(`Name: ${ADMIN_USER.name}`);
    console.log(`Email: ${ADMIN_USER.email}`);
    console.log(`Password: ${ADMIN_USER.password}`);
    console.log(`Role: ${ADMIN_USER.role}\n`);

    // Check if admin already exists
    const existingUser = await User.findOne({ email: ADMIN_USER.email });
    if (existingUser) {
      console.log('⚠️  Admin user already exists!');
      console.log('\n📋 Login Details:');
      console.log(`Email: ${ADMIN_USER.email}`);
      console.log(`Password: ${ADMIN_USER.password}`);
      console.log('\n🔗 Login URL: http://localhost:3000/login');
      await mongoose.connection.close();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_USER.password, salt);

    // Create admin user
    const admin = await User.create({
      ...ADMIN_USER,
      password: hashedPassword
    });
    
    console.log('✅ Admin account created successfully!');
    console.log('\n📋 Login Details:');
    console.log(`Email: ${ADMIN_USER.email}`);
    console.log(`Password: ${ADMIN_USER.password}`);
    console.log('\n🔗 Login URL: http://localhost:3000/login');
    console.log('\n💡 User ID:', admin._id);
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Wait for MongoDB connection
mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB\n');
  createAdmin();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
