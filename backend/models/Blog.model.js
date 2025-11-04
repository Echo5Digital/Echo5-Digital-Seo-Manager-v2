const mongoose = require('mongoose');
const { normalizeTitle } = require('../utils/titleNormalizer');

const BlogSchema = new mongoose.Schema({
  // Client & User Info
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // SEO Meta Data
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  normalizedTitle: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  metaTitle: {
    type: String,
    required: true,
    maxlength: [60, 'Meta title should not exceed 60 characters']
  },
  metaDescription: {
    type: String,
    required: true,
    maxlength: [160, 'Meta description should not exceed 160 characters']
  },
  
  // Keywords & SEO
  focusKeyword: {
    type: String,
    required: [true, 'Focus keyword is required'],
    trim: true
  },
  secondaryKeywords: [{
    type: String,
    trim: true
  }],
  semanticKeywords: [{
    type: String,
    trim: true
  }],
  
  // Content
  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  wordCount: {
    type: Number,
    default: 0
  },
  
  // Structure
  headings: {
    h1: { type: String },
    h2: [{ type: String }],
    h3: [{ type: String }],
    h4: [{ type: String }]
  },
  
  // Internal Links
  internalLinks: [{
    url: { type: String },
    anchorText: { type: String },
    targetPage: { type: String }
  }],
  
  // Images
  featuredImage: {
    url: { type: String },
    alt: { type: String },
    title: { type: String }
  },
  images: [{
    url: { type: String },
    alt: { type: String },
    altAlternative: { type: String }, // Second alt text option
    title: { type: String }
  }],
  
  // FAQ Section
  faqs: [{
    question: { type: String, required: true },
    answer: { type: String, required: true }
  }],
  
  // Schema Markup
  schemas: {
    article: { type: Object },
    faq: { type: Object },
    breadcrumb: { type: Object }
  },
  
  // SEO Analysis
  seoScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  readabilityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Publishing
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  scheduledFor: {
    type: Date
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
BlogSchema.index({ clientId: 1, status: 1 });
BlogSchema.index({ slug: 1 }, { unique: true });
BlogSchema.index({ focusKeyword: 1 });
BlogSchema.index({ createdAt: -1 });
BlogSchema.index({ clientId: 1, normalizedTitle: 1 });
BlogSchema.index({ normalizedTitle: 1 });
BlogSchema.index({ assignedTo: 1, status: 1 });

// Normalize title for duplicate detection
// (moved to utils/titleNormalizer.js)

// Generate slug and normalized title from title
BlogSchema.pre('validate', function(next) {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Always update normalized title when title changes
  if (this.title) {
    this.normalizedTitle = normalizeTitle(this.title);
  }
  
  next();
});

// Calculate word count
BlogSchema.pre('save', function(next) {
  if (this.content) {
    // Remove HTML tags and count words
    const textContent = this.content.replace(/<[^>]*>/g, ' ');
    const words = textContent.trim().split(/\s+/);
    this.wordCount = words.filter(word => word.length > 0).length;
  }
  next();
});

// Generate Article Schema
BlogSchema.methods.generateArticleSchema = function() {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": this.title,
    "description": this.metaDescription,
    "image": this.featuredImage?.url || "",
    "author": {
      "@type": "Organization",
      "name": this.clientId?.name || "Author"
    },
    "publisher": {
      "@type": "Organization",
      "name": this.clientId?.name || "Publisher",
      "logo": {
        "@type": "ImageObject",
        "url": this.clientId?.logo || ""
      }
    },
    "datePublished": this.publishedAt || this.createdAt,
    "dateModified": this.updatedAt
  };
};

// Generate FAQ Schema
BlogSchema.methods.generateFAQSchema = function() {
  if (!this.faqs || this.faqs.length === 0) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": this.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
};

// Generate Breadcrumb Schema
BlogSchema.methods.generateBreadcrumbSchema = function() {
  const baseUrl = this.clientId?.website || "";
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": `${baseUrl}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": this.title,
        "item": `${baseUrl}/blog/${this.slug}`
      }
    ]
  };
};

module.exports = mongoose.model('Blog', BlogSchema);
