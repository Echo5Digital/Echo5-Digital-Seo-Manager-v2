const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @typedef {Object} User
 * @property {string} name - User's full name
 * @property {string} email - User's email address
 * @property {string} password - Hashed password
 * @property {string} role - User role (Boss, Staff, Developer)
 * @property {string[]} assignedClients - Array of client IDs
 * @property {boolean} isActive - Account status
 * @property {Object} avatar - Profile picture URL
 * @property {Date} createdAt - Account creation date
 * @property {Date} updatedAt - Last update date
 */

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: function() {
      // Password is not required if user signed up with Google
      return !this.googleId;
    },
    minlength: 6,
    select: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allow null values, only enforce uniqueness when value exists
  },
  picture: {
    type: String, // Google profile picture URL
  },
  role: {
    type: String,
    enum: ['Boss', 'Manager', 'Staff', 'Developer'],
    default: 'Staff',
    required: true,
  },
  assignedClients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  lastLogin: {
    type: Date,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // NEW: Skills tracking
  skills: [{
    name: {
      type: String,
      enum: [
        'Technical SEO',
        'Content Writing',
        'Link Building',
        'Local SEO',
        'Analytics',
        'Keyword Research',
        'On-Page Optimization',
        'Site Auditing',
        'Competitor Analysis',
        'Reporting',
        'Client Communication',
        'Project Management'
      ]
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Intermediate'
    },
    yearsExperience: { type: Number, default: 0 }
  }],
  
  // NEW: Capacity tracking
  capacity: {
    hoursPerWeek: { type: Number, default: 40 },
    currentLoad: { type: Number, default: 0 },      // Hours currently assigned
    maxClients: { type: Number, default: 10 },
    availability: {
      type: String,
      enum: ['Available', 'Busy', 'Overloaded', 'On Leave'],
      default: 'Available'
    }
  },
  
  // NEW: Activity tracking
  activityLog: [{
    action: {
      type: String,
      enum: [
        'login',
        'logout', 
        'task_created',
        'task_completed',
        'audit_run',
        'report_generated',
        'client_updated',
        'keyword_added',
        'page_added',
        'backlink_added'
      ]
    },
    details: mongoose.Schema.Types.Mixed,
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    timestamp: { type: Date, default: Date.now },
    ipAddress: String
  }],
  
  // NEW: Performance metrics
  performance: {
    tasksCompleted: { type: Number, default: 0 },
    tasksCompletedThisMonth: { type: Number, default: 0 },
    avgTaskCompletionTime: Number,     // in hours
    auditsRun: { type: Number, default: 0 },
    reportsGenerated: { type: Number, default: 0 },
    lastActive: Date,
    streak: { type: Number, default: 0 }  // Consecutive active days
  }
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
