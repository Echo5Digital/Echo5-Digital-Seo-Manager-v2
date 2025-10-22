const mongoose = require('mongoose');

/**
 * @typedef {Object} Audit
 * @property {ObjectId} clientId - Reference to Client
 * @property {string} auditType - Type of audit performed
 * @property {Object} results - Audit findings
 * @property {Object} aiAnalysis - AI-generated insights
 * @property {Date} createdAt
 */

const auditSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  auditType: {
    type: String,
    enum: ['Full Site', 'Technical', 'Content', 'On-Page', 'Quick Scan'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Failed'],
    default: 'Pending',
  },
  results: {
    // Broken Links
    brokenLinks: [{
      url: String,
      statusCode: Number,
      foundOn: [String],
      severity: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
      },
    }],
    
    // Missing Alt Tags
    missingAltTags: [{
      imageUrl: String,
      pageUrl: String,
      severity: String,
    }],
    
    // Meta Issues
    metaIssues: [{
      url: String,
      issue: String,
      type: {
        type: String,
        enum: ['Missing Title', 'Missing Description', 'Duplicate Title', 'Duplicate Description', 'Too Long', 'Too Short'],
      },
      severity: String,
    }],
    
    // Noindex Issues
    noindexPages: [{
      url: String,
      reason: String,
      severity: String,
    }],
    
    // Page Speed
    pageSpeed: [{
      url: String,
      loadTime: Number,
      mobileScore: Number,
      desktopScore: Number,
      recommendations: [String],
      severity: String,
    }],
    
    // Schema Markup
    schemaIssues: [{
      url: String,
      issue: String,
      type: String,
      severity: String,
    }],
    
    // Internal Linking
    internalLinkingIssues: [{
      url: String,
      issue: String,
      orphanedPages: Boolean,
      severity: String,
    }],
    
    // Sitemap Issues
    sitemapIssues: [{
      issue: String,
      details: String,
      severity: String,
    }],
    
    // Robots.txt Issues
    robotsTxtIssues: [{
      issue: String,
      severity: String,
    }],
    
    // SSL/HTTPS
    sslIssues: [{
      url: String,
      issue: String,
      severity: String,
    }],
    
    // Mobile Usability
    mobileIssues: [{
      url: String,
      issue: String,
      severity: String,
    }],
  },
  
  summary: {
    totalIssues: {
      type: Number,
      default: 0,
    },
    criticalCount: {
      type: Number,
      default: 0,
    },
    highCount: {
      type: Number,
      default: 0,
    },
    mediumCount: {
      type: Number,
      default: 0,
    },
    lowCount: {
      type: Number,
      default: 0,
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  
  aiAnalysis: {
    executiveSummary: String,
    topPriorities: [String],
    quickWins: [String],
    longTermActions: [String],
    estimatedImpact: String,
    analyzedAt: Date,
  },
  
  performedBy: {
    type: String,
    enum: ['Automated', 'Manual'],
    default: 'Automated',
  },
  
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  completedAt: {
    type: Date,
  },
  
  nextScheduledAudit: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
auditSchema.index({ clientId: 1, createdAt: -1 });
auditSchema.index({ status: 1 });

module.exports = mongoose.model('Audit', auditSchema);
