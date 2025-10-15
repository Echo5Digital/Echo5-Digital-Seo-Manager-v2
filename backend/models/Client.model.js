const mongoose = require('mongoose');

/**
 * @typedef {Object} Client
 * @property {string} name - Client name
 * @property {string} domain - Website domain
 * @property {string} cms - CMS type (WordPress, Shopify, etc.)
 * @property {string[]} assignedStaff - Staff user IDs
 * @property {string} industry - Business industry/niche
 * @property {Object} seoHealth - Overall SEO health score
 * @property {Object} contactInfo - Client contact details
 * @property {boolean} isActive - Client status
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    trim: true,
    lowercase: true,
    unique: true,
  },
  cms: {
    type: String,
    enum: ['WordPress', 'Shopify', 'Wix', 'Webflow', 'Custom', 'Other'],
    default: 'WordPress',
  },
  assignedStaff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  industry: {
    type: String,
    trim: true,
  },
  seoHealth: {
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastChecked: {
      type: Date,
    },
    criticalIssues: {
      type: Number,
      default: 0,
    },
    highIssues: {
      type: Number,
      default: 0,
    },
    mediumIssues: {
      type: Number,
      default: 0,
    },
    lowIssues: {
      type: Number,
      default: 0,
    },
  },
  contactInfo: {
    email: String,
    phone: String,
    primaryContact: String,
  },
  settings: {
    autoAudit: {
      type: Boolean,
      default: true,
    },
    auditFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly',
    },
    rankTrackingEnabled: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  notes: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for faster queries (domain already has unique index)
clientSchema.index({ assignedStaff: 1 });
clientSchema.index({ isActive: 1 });

module.exports = mongoose.model('Client', clientSchema);
