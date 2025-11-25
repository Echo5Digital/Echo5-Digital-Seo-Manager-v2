const mongoose = require('mongoose');

/**
 * @typedef {Object} Client
 * @property {string} name - Client name
 * @property {string} domain - Website domain
 * @property {string} website - Full website URL
 * @property {string} cms - CMS type (WordPress, Shopify, etc.)
 * @property {string[]} assignedStaff - Staff user IDs
 * @property {string} industry - Business industry/niche
 * @property {Array} locations - Business locations
 * @property {Array} services - Services offered
 * @property {Array} competitors - Main competitors
 * @property {Array} primaryKeywords - High priority keywords
 * @property {Array} secondaryKeywords - Secondary keywords
 * @property {Array} seedKeywords - Seed keywords for research
 * @property {Object} integrations - Third-party integrations
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
  website: {
    type: String,
    trim: true,
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
  locations: [{
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: 'US',
    },
    zip: {
      type: String,
      trim: true,
    },
    radius: {
      type: Number,
      default: 25,
    },
    radiusUnit: {
      type: String,
      enum: ['miles', 'km'],
      default: 'miles',
    },
  }],
  services: [{
    type: String,
    trim: true,
  }],
  competitors: [{
    type: String,
    trim: true,
  }],
  primaryKeywords: [{
    keyword: {
      type: String,
      trim: true,
    },
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    targetLocation: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  secondaryKeywords: [{
    keyword: {
      type: String,
      trim: true,
    },
    targetLocation: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  seedKeywords: [{
    keyword: {
      type: String,
      trim: true,
    },
    searchVolume: {
      type: Number,
    },
    difficulty: {
      type: Number,
    },
    intent: {
      type: String,
      enum: ['informational', 'transactional', 'navigational', 'local'],
      default: 'informational',
    },
    source: {
      type: String,
      enum: ['csv', 'gsc', 'manual'],
      default: 'manual',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  integrations: {
    googleSearchConsole: {
      type: Boolean,
      default: false,
    },
    googleAnalytics: {
      type: Boolean,
      default: false,
    },
    googleBusinessProfile: {
      type: Boolean,
      default: false,
    },
    // GA4 Integration
    ga4PropertyId: {
      type: String,
      trim: true,
    },
    // Google Search Console Integration
    gscSiteUrl: {
      type: String,
      trim: true,
    },
    // Google Business Profile Integration
    gbpLocationIds: [{
      type: String,
      trim: true,
    }],
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
  // WordPress Plugin Integration
  wordpressPlugin: {
    enabled: {
      type: Boolean,
      default: false,
    },
    apiKey: {
      type: String,
      select: false, // Don't select by default for security
    },
    siteUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['not_configured', 'active', 'error', 'disconnected'],
      default: 'not_configured',
    },
    lastSync: {
      type: Date,
    },
    lastHealthCheck: {
      type: Date,
    },
    pluginVersion: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
  },
  // Data Source Selection
  dataSource: {
    type: String,
    enum: ['auto', 'wordpress_plugin', 'scraping'],
    default: 'auto',
    // 'auto': Try plugin first, fallback to scraping if plugin unavailable
    // 'wordpress_plugin': Only use plugin, fail if not available
    // 'scraping': Force traditional web scraping
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
