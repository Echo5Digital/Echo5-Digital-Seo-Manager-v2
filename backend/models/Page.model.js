const mongoose = require('mongoose');

/**
 * @typedef {Object} Page
 * @property {ObjectId} clientId - Reference to Client
 * @property {string} url - Full page URL
 * @property {string} slug - URL slug
 * @property {string} title - Page title (SEO)
 * @property {string} metaDescription - Meta description
 * @property {string} h1 - Main heading
 * @property {string} type - Page type (page, blog, product, category)
 * @property {string} status - Published, Draft, Archived
 * @property {Object} seo - SEO metadata
 * @property {Object} structuredData - JSON-LD schema
 * @property {Array} keywords - Target keywords for this page
 * @property {Array} images - Images with alt tags
 * @property {Object} openGraph - OG tags
 * @property {Object} twitter - Twitter card data
 * @property {Object} performance - Page performance metrics
 * @property {Date} publishedAt
 * @property {Date} lastModified
 */

const pageSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  url: {
    type: String,
    required: [true, 'Page URL is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    trim: true,
    lowercase: true,
  },
  title: {
    type: String,
    required: [true, 'Page title is required'],
    maxlength: [200, 'Title should not exceed 200 characters'],
    trim: true,
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description should not exceed 160 characters'],
    trim: true,
  },
  h1: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['page', 'blog', 'product', 'category', 'landing'],
    default: 'page',
  },
  status: {
    type: String,
    enum: ['Published', 'Draft', 'Archived', 'Scheduled'],
    default: 'Draft',
  },
  excluded: {
    type: Boolean,
    default: false,
  },
  
  // SEO Metadata
  seo: {
    canonical: String,
    robots: {
      type: String,
      default: 'index,follow',
    },
    focusKeyword: String,
    secondaryKeywords: [String],
    readabilityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    seoScore: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  
  // Structured Data (JSON-LD)
  structuredData: {
    type: {
      type: String,
      enum: [
        'Article',
        'BlogPosting',
        'Product',
        'Organization',
        'WebPage',
        'FAQPage',
        'HowTo',
        'Recipe',
        'Event',
        'LocalBusiness',
      ],
    },
    schema: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  
  // Target Keywords
  keywords: [{
    keyword: String,
    density: Number, // Keyword density percentage
    position: Number, // First occurrence position
    inTitle: Boolean,
    inMeta: Boolean,
    inH1: Boolean,
    inUrl: Boolean,
  }],
  
  // Images with Alt Tags
  images: [{
    url: String,
    alt: {
      type: String,
      default: '',
    },
    title: String,
    width: Number,
    height: Number,
    size: Number, // File size in KB
    optimized: {
      type: Boolean,
      default: false,
    },
  }],
  
  // Open Graph Tags
  openGraph: {
    title: String,
    description: String,
    image: String,
    url: String,
    type: {
      type: String,
      default: 'website',
    },
    siteName: String,
    locale: {
      type: String,
      default: 'en_US',
    },
  },
  
  // Twitter Card
  twitter: {
    card: {
      type: String,
      enum: ['summary', 'summary_large_image', 'app', 'player'],
      default: 'summary_large_image',
    },
    title: String,
    description: String,
    image: String,
    site: String, // @username
    creator: String, // @username
  },
  
  // Content Analysis
  content: {
    wordCount: Number,
    readingTime: Number, // In minutes
    paragraphs: Number,
    headings: {
      h1Count: Number,
      h2Count: Number,
      h3Count: Number,
    },
    links: {
      internal: Number,
      external: Number,
      broken: Number,
    },
    sample: String,
    // Ordered content blocks for neat preview
    blocks: [{
      tag: { type: String }, // e.g., 'h1', 'p', 'li'
      text: { type: String }
    }],
    // Internal links with anchor text
    internalLinks: [{
      url: { type: String },
      anchorText: { type: String },
      isNofollow: { type: Boolean, default: false }
    }],
  },
  
  // Performance Metrics
  performance: {
    loadTime: Number, // In seconds
    mobileScore: Number,
    desktopScore: Number,
    firstContentfulPaint: Number,
    largestContentfulPaint: Number,
    cumulativeLayoutShift: Number,
    timeToInteractive: Number,
  },
  
  // Technical SEO
  technical: {
    hasSSL: Boolean,
    isMobileFriendly: Boolean,
    hasViewport: Boolean,
    hasLanguage: Boolean,
    hasCharset: Boolean,
    responsiveImages: Boolean,
    lazyLoading: Boolean,
  },
  
  // Publishing
  publishedAt: Date,
  scheduledFor: Date,
  lastModified: Date,
  
  // Author/Editor
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Indexing Status
  indexing: {
    googleIndexed: Boolean,
    googleIndexedDate: Date,
    bingIndexed: Boolean,
    sitemapIncluded: {
      type: Boolean,
      default: true,
    },
  },
  
  // Issues/Warnings
  issues: [{
    type: {
      type: String,
      enum: ['error', 'warning', 'info'],
    },
    category: String, // 'title', 'meta', 'images', 'content', 'technical'
    message: String,
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
    },
    detectedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Notes
  notes: String,
  
}, {
  timestamps: true,
});

// Indexes for performance
pageSchema.index({ clientId: 1, slug: 1 }, { unique: true });
pageSchema.index({ clientId: 1, type: 1 });
pageSchema.index({ status: 1 });
pageSchema.index({ 'seo.focusKeyword': 1 });
pageSchema.index({ publishedAt: -1 });

// Pre-save hook to update lastModified
pageSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Page', pageSchema);
