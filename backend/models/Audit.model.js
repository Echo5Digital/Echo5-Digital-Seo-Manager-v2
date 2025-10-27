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
    enum: ['Pending', 'Queued', 'Running', 'In Progress', 'Completed', 'Failed'],
    default: 'Pending',
  },
  results: {
    // Page Discovery & Analysis (NEW - Enhanced fields)
    discoveredPages: [{
      url: String,
      title: String,
      h1: String,
      metaDescription: String,
      statusCode: Number,
      contentLength: Number,
      contentType: String,
      wordCount: Number,
      contentPreview: String,
      robots: String,
      isIndexable: Boolean,
      discoveredAt: Date,
      issues: [String]
    }],
    
    pageAnalysis: [{
      url: String,
      title: String,
      statusCode: Number,
      seoScore: Number,
      loadTime: Number,
      
      metaData: {
        title: {
          content: String,
          length: Number,
          isEmpty: Boolean,
          isTooShort: Boolean,
          isTooLong: Boolean
        },
        description: {
          content: String,
          length: Number,
          isEmpty: Boolean,
          isTooShort: Boolean,
          isTooLong: Boolean
        },
        keywords: String,
        robots: String,
        canonical: String,
        ogTitle: String,
        ogDescription: String,
        ogImage: String,
        twitterCard: String
      },
      
      headings: {
        h1: [String],
        h2: [String],
        h3: [String],
        h4: [String],
        h5: [String],
        h6: [String],
        structure: [{ level: Number, text: String }],
        hasH1: Boolean,
        hasMultipleH1: Boolean
      },
      
      images: {
        total: Number,
        withAlt: Number,
        withoutAlt: Number,
        details: [{
          src: String,
          alt: String,
          width: Number,
          height: Number
        }]
      },
      
      links: {
        internal: {
          count: Number,
          details: [{ href: String, text: String }]
        },
        external: {
          count: Number,
          details: [{ href: String, text: String }]
        }
      },
      
      content: {
        wordCount: Number,
        textLength: Number,
        htmlSize: Number,
        readabilityScore: Number,
        hasDuplicateContent: Boolean
      },
      
      technical: {
        hasStructuredData: Boolean,
        structuredDataTypes: [String],
        hasViewport: Boolean,
        hasCharset: Boolean,
        isResponsive: Boolean,
        httpVersion: String
      },
      
      performance: {
        firstByteTime: Number,
        domLoadTime: Number,
        resourceCount: Number,
        totalSize: Number
      },
      
      seoOpportunities: {
        critical: [{ issue: String, description: String, fix: String }],
        opportunities: [{ issue: String, description: String, impact: String }],
        recommendations: [{ issue: String, description: String, benefit: String }]
      }
    }],
    
    // Aggregated Data (NEW - For easy display)
    metaAnalysis: [{
      url: String,
      title: String,
      description: String,
      issues: [mongoose.Schema.Types.Mixed]
    }],
    
    headingStructure: [{
      url: String,
      headings: [mongoose.Schema.Types.Mixed],
      issues: [mongoose.Schema.Types.Mixed]
    }],
    
    imageAnalysis: [{
      url: String,
      totalImages: Number,
      imagesWithAlt: Number,
      imagesWithoutAlt: Number,
      images: [mongoose.Schema.Types.Mixed],
      issues: [mongoose.Schema.Types.Mixed]
    }],
    
    linkAnalysis: [{
      url: String,
      internalLinks: Number,
      externalLinks: Number,
      linkDetails: mongoose.Schema.Types.Mixed
    }],
    
    contentAnalysis: [{
      url: String,
      wordCount: Number,
      textLength: Number,
      htmlSize: Number,
      issues: [mongoose.Schema.Types.Mixed]
    }],
    
    // Original fields (keeping for backwards compatibility)
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
