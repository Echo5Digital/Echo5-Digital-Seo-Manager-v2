# 📄 Pages & Content Management - Complete Guide

## ✨ Overview

The **Pages & Content Management** module provides comprehensive on-page SEO optimization for individual pages, blog posts, products, and landing pages. Manage all SEO metadata, structured data, Open Graph tags, Twitter cards, and get AI-powered insights.

---

## 🎯 Features Implemented

### ✅ Page Management
- **CRUD Operations**: Create, Read, Update, Delete pages
- **Page Types**: Page, Blog Post, Product, Category, Landing Page
- **Status Management**: Draft, Published, Scheduled, Archived
- **Multi-client Support**: Manage pages across all clients

### ✅ SEO Metadata
- **Title Optimization**: Character counter (max 60)
- **Meta Description**: Character counter (max 160)
- **H1 Heading**: Main page heading
- **URL & Slug**: Clean, SEO-friendly URLs
- **Canonical URL**: Prevent duplicate content issues
- **Robots Meta**: Control indexing (index/noindex, follow/nofollow)
- **Focus Keyword**: Primary keyword tracking

### ✅ Structured Data (JSON-LD)
- **Schema Types**:
  - Article / BlogPosting
  - Product
  - WebPage
  - FAQPage
  - HowTo
  - Recipe
  - Event
  - LocalBusiness
  - Organization

- **Auto-generation**: Generate schema based on page data
- **Custom Schema**: Edit JSON-LD manually
- **Valid Markup**: Schema.org compliant

### ✅ Open Graph Tags
- **OG Title**: Social media title
- **OG Description**: Social media description
- **OG Image**: Social share image (1200x630 recommended)
- **OG URL**: Canonical URL for social shares
- **OG Type**: website, article, product, etc.
- **OG Locale**: Language/region (en_US, etc.)

### ✅ Twitter Card
- **Card Types**: Summary, Summary Large Image, App, Player
- **Twitter Title**: Card title
- **Twitter Description**: Card description
- **Twitter Image**: Card image
- **Twitter Site**: @username for site
- **Twitter Creator**: @username for content creator

### ✅ Image Management
- **Alt Tags**: Required for accessibility & SEO
- **Title Attributes**: Optional image titles
- **Image Dimensions**: Width & height tracking
- **File Size**: Optimization tracking
- **Missing Alt Detection**: Auto-flag images without alt tags

### ✅ Content Analysis
- **Word Count**: Track content length
- **Reading Time**: Estimated minutes
- **Paragraph Count**: Content structure
- **Heading Analysis**: H1, H2, H3 counts
- **Link Analysis**: Internal, external, broken links

### ✅ SEO Issue Detection
- **Automated Checks**:
  - Missing title
  - Title too short (<30 chars)
  - Title too long (>60 chars)
  - Missing meta description
  - Meta description too short (<120 chars)
  - Missing H1
  - Images without alt tags
  - Missing structured data
  - Missing canonical URL
  - Incomplete Open Graph tags

- **Issue Severity**: Critical, High, Medium, Low
- **Issue Categories**: Title, Meta, Content, Images, Technical

### ✅ AI-Powered Analysis
- **SEO Score**: 0-100 based on best practices
- **AI Recommendations**: Actionable improvements
- **Content Suggestions**: AI-generated ideas
- **Meta Generation**: Auto-create meta descriptions
- **Alt Text Suggestions**: AI-powered alt text for images

### ✅ Performance Metrics
- **Load Time**: Page speed tracking
- **Mobile Score**: Mobile-friendliness
- **Desktop Score**: Desktop performance
- **Core Web Vitals**:
  - First Contentful Paint (FCP)
  - Largest Contentful Paint (LCP)
  - Cumulative Layout Shift (CLS)
  - Time to Interactive (TTI)

### ✅ Technical SEO
- **SSL Status**: HTTPS check
- **Mobile-Friendly**: Responsive design check
- **Viewport Meta**: Viewport tag present
- **Language Tag**: HTML lang attribute
- **Charset**: UTF-8 charset
- **Responsive Images**: Adaptive images
- **Lazy Loading**: Deferred image loading

### ✅ Publishing
- **Publish Status**: Track publish dates
- **Schedule**: Schedule future publishing
- **Last Modified**: Track updates
- **Author Tracking**: Page author & last editor
- **Version Control**: Track modifications

### ✅ Indexing
- **Google Index Status**: Track if indexed
- **Google Index Date**: When indexed
- **Bing Index Status**: Bing indexing
- **Sitemap Inclusion**: Include in XML sitemap

---

## 📊 Database Schema

```javascript
{
  clientId: ObjectId,          // Client reference
  url: String,                 // Full URL
  slug: String,                // URL slug
  title: String,               // Page title (max 60)
  metaDescription: String,     // Meta description (max 160)
  h1: String,                  // Main heading
  type: Enum,                  // page, blog, product, category, landing
  status: Enum,                // Published, Draft, Archived, Scheduled
  
  seo: {
    canonical: String,
    robots: String,            // index,follow | noindex,follow
    focusKeyword: String,
    readabilityScore: Number,
    seoScore: Number,
  },
  
  structuredData: {
    type: String,              // Article, Product, etc.
    schema: Object,            // JSON-LD schema
  },
  
  keywords: [{
    keyword: String,
    density: Number,
    position: Number,
    inTitle: Boolean,
    inMeta: Boolean,
    inH1: Boolean,
    inUrl: Boolean,
  }],
  
  images: [{
    url: String,
    alt: String,
    title: String,
    width: Number,
    height: Number,
    size: Number,
    optimized: Boolean,
  }],
  
  openGraph: {
    title: String,
    description: String,
    image: String,
    url: String,
    type: String,
    siteName: String,
    locale: String,
  },
  
  twitter: {
    card: String,
    title: String,
    description: String,
    image: String,
    site: String,
    creator: String,
  },
  
  content: {
    wordCount: Number,
    readingTime: Number,
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
  },
  
  performance: {
    loadTime: Number,
    mobileScore: Number,
    desktopScore: Number,
    firstContentfulPaint: Number,
    largestContentfulPaint: Number,
    cumulativeLayoutShift: Number,
    timeToInteractive: Number,
  },
  
  issues: [{
    type: String,            // error, warning, info
    category: String,        // title, meta, images, content, technical
    message: String,
    severity: String,        // critical, high, medium, low
  }],
  
  publishedAt: Date,
  lastModified: Date,
  author: ObjectId,
  lastEditedBy: ObjectId,
}
```

---

## 🔌 API Endpoints

```javascript
// Get all pages
GET /api/pages
Query: ?clientId=xxx&type=blog&status=Published

// Get single page
GET /api/pages/:id

// Create page
POST /api/pages
Body: { clientId, url, slug, title, metaDescription, ... }

// Update page
PUT /api/pages/:id
Body: { title, metaDescription, ... }

// Delete page
DELETE /api/pages/:id

// AI analyze page SEO
POST /api/pages/:id/analyze
Response: { score, issues, recommendations, contentSuggestions }

// Generate structured data
POST /api/pages/:id/generate-schema
Body: { schemaType: 'Article' }
Response: { schema: {...} }

// Check SEO issues
POST /api/pages/:id/check-issues
Response: { issues: [...] }
```

---

## 💡 Usage Examples

### Create a Blog Post

```javascript
const blogPost = {
  clientId: '507f1f77bcf86cd799439011',
  url: 'https://example.com/blog/seo-tips-2025',
  slug: 'seo-tips-2025',
  title: 'Top 10 SEO Tips for 2025 | Complete Guide',
  metaDescription: 'Discover the latest SEO strategies for 2025. Learn proven techniques to boost your search rankings and drive organic traffic.',
  h1: 'Top 10 SEO Tips for 2025',
  type: 'blog',
  status: 'Published',
  
  seo: {
    canonical: 'https://example.com/blog/seo-tips-2025',
    robots: 'index,follow',
    focusKeyword: 'seo tips 2025',
  },
  
  openGraph: {
    title: 'Top 10 SEO Tips for 2025',
    description: 'Boost your rankings with these proven SEO strategies',
    image: 'https://example.com/images/seo-tips-og.jpg',
    type: 'article',
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'Top 10 SEO Tips for 2025',
    image: 'https://example.com/images/seo-tips-twitter.jpg',
  },
  
  images: [
    {
      url: 'https://example.com/images/seo-chart.png',
      alt: 'SEO ranking factors chart showing top 10 ranking signals',
      width: 1200,
      height: 630,
    }
  ],
}

// Add page
await pageStore.addPage(blogPost)
```

### Generate JSON-LD Schema

```javascript
// Generate Article schema
const schema = await pageStore.generateSchema(pageId, 'BlogPosting')

// Result:
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Top 10 SEO Tips for 2025",
  "description": "Discover the latest SEO strategies...",
  "image": "https://example.com/images/seo-tips-og.jpg",
  "datePublished": "2025-10-16T10:00:00Z",
  "dateModified": "2025-10-16T10:00:00Z",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  }
}
```

### AI Page Analysis

```javascript
// Analyze page SEO
const analysis = await pageStore.analyzePage(pageId)

// Result:
{
  score: 85,
  issues: [
    {
      type: 'warning',
      category: 'images',
      message: '2 images missing alt tags',
      severity: 'medium'
    }
  ],
  recommendations: [
    'Add alt tags to all images',
    'Increase word count to 1500+ words',
    'Add internal links to related content'
  ],
  contentSuggestions: [
    'Include statistics about SEO trends',
    'Add expert quotes',
    'Create infographic summary'
  ]
}
```

---

## 🎯 SEO Best Practices

### Title Tags
```
✅ DO:
- Keep under 60 characters
- Include primary keyword near beginning
- Make it compelling and click-worthy
- Be specific and descriptive

❌ DON'T:
- Keyword stuff
- Use all caps
- Duplicate across pages
- Use special characters excessively
```

### Meta Descriptions
```
✅ DO:
- Keep under 160 characters
- Include primary keyword naturally
- Write for humans, not robots
- Include call-to-action
- Match page content accurately

❌ DON'T:
- Duplicate across pages
- Write vague descriptions
- Ignore character limits
- Keyword stuff
```

### Structured Data
```
✅ DO:
- Use schema.org vocabulary
- Test with Google Rich Results Test
- Match content on page
- Include all required properties
- Validate JSON-LD syntax

❌ DON'T:
- Add irrelevant schema
- Use deprecated types
- Mark up hidden content
- Use incorrect properties
```

### Image Alt Tags
```
✅ DO:
- Be descriptive and specific
- Include relevant keywords naturally
- Keep under 125 characters
- Describe what's in the image
- Help visually impaired users

❌ DON'T:
- Keyword stuff
- Use "image of" or "picture of"
- Leave alt tags empty
- Use generic descriptions
```

---

## 📈 Common Use Cases

### 1. Blog SEO Optimization
```
1. Create blog post with proper title/meta
2. Add focus keyword
3. Generate BlogPosting schema
4. Add images with descriptive alt tags
5. Set Open Graph tags for social sharing
6. Run AI analysis for improvements
7. Publish when SEO score > 80
```

### 2. Product Page Optimization
```
1. Create product page
2. Add product title, description
3. Generate Product schema with price, availability
4. Add product images with alt tags
5. Set structured data for rich snippets
6. Check for issues
7. Publish
```

### 3. Landing Page Optimization
```
1. Create landing page
2. Optimize title for conversion
3. Write compelling meta description
4. Add hero image with alt tag
5. Set noindex,follow if needed
6. A/B test different titles/metas
```

---

## 🚀 Quick Actions

### Check All Pages for Issues
```javascript
const pagesWithIssues = pageStore.pagesWithIssues
console.log(`${pagesWithIssues.length} pages need attention`)
```

### Bulk Status Update
```javascript
// Publish all draft blogs
const draftBlogs = pageStore.pages.filter(p => 
  p.type === 'blog' && p.status === 'Draft'
)

for (const page of draftBlogs) {
  await pageStore.updatePage(page._id, { status: 'Published' })
}
```

### Find Missing Alt Tags
```javascript
const pagesWithMissingAlt = pageStore.pages.filter(page => 
  page.images.some(img => !img.alt)
)
console.log(`${pagesWithMissingAlt.length} pages have images without alt tags`)
```

---

## 🔧 Advanced Features

### Custom JSON-LD Schema
```javascript
// Add custom FAQ schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is SEO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SEO stands for Search Engine Optimization..."
      }
    }
  ]
}

await pageStore.updatePage(pageId, {
  structuredData: {
    type: 'FAQPage',
    schema: faqSchema
  }
})
```

### Keyword Density Tracking
```javascript
const pageKeywords = {
  keywords: [
    {
      keyword: 'SEO tips',
      density: 2.5,
      position: 45,
      inTitle: true,
      inMeta: true,
      inH1: true,
      inUrl: true,
    }
  ]
}
```

---

## ✅ Complete Feature Checklist

- [x] Page CRUD operations
- [x] Title optimization (60 char limit)
- [x] Meta description (160 char limit)
- [x] URL slug management
- [x] H1 heading tracking
- [x] Page type categorization
- [x] Status management
- [x] Focus keyword tracking
- [x] Canonical URL
- [x] Robots meta tags
- [x] Open Graph tags (title, description, image, type, locale)
- [x] Twitter Card (card type, title, description, image)
- [x] Image management with alt tags
- [x] JSON-LD structured data
- [x] Schema.org support (10+ types)
- [x] Auto schema generation
- [x] SEO issue detection (10+ checks)
- [x] Issue severity levels
- [x] AI-powered analysis
- [x] AI recommendations
- [x] Content suggestions
- [x] SEO scoring (0-100)
- [x] Publishing workflow
- [x] Author tracking
- [x] Modification history
- [x] Multi-client support
- [x] Bulk operations
- [x] Search & filters
- [x] Statistics dashboard

---

## 📚 Documentation

**Admin Login**:
```
URL: http://localhost:3000/pages
Email: admin@echo5.com
Password: Admin@123456
```

**Quick Test**:
1. Navigate to Pages
2. Click "Add Page"
3. Fill in title, URL, meta description
4. Add Open Graph tags
5. Save and analyze with AI
6. View SEO score and recommendations

---

**Last Updated**: October 16, 2025  
**Status**: Production Ready ✅  
**Feature**: Pages & Content Management 📄
