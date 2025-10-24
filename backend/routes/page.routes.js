const express = require('express');
const router = express.Router();
const Page = require('../models/Page.model');
const { protect } = require('../middleware/auth');
const aiService = require('../services/ai.service');
const { default: mongoose } = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');

// GET /api/pages - Get all pages with filters
router.get('/', protect, async (req, res, next) => {
  try {
    const { clientId, type, status } = req.query;
    
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    const pages = await Page.find(filter)
      .populate('clientId', 'name domain')
      .populate('author', 'name email')
      .sort('-lastModified');

    res.json({
      status: 'success',
      results: pages.length,
      data: { pages },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/pages/:id - Get single page
router.get('/:id', protect, async (req, res, next) => {
  try {
    const page = await Page.findById(req.params.id)
      .populate('clientId', 'name domain')
      .populate('author', 'name email')
      .populate('lastEditedBy', 'name email');

    if (!page) {
      return res.status(404).json({
        status: 'error',
        message: 'Page not found',
      });
    }

    res.json({
      status: 'success',
      data: { page },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/pages - Create new page
router.post('/', protect, async (req, res, next) => {
  try {
    const pageData = {
      ...req.body,
      author: req.user._id,
      lastEditedBy: req.user._id,
    };
    
    const page = await Page.create(pageData);

    res.status(201).json({
      status: 'success',
      data: { page },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/pages/:id - Update page
router.put('/:id', protect, async (req, res, next) => {
  try {
    const updateData = {
      ...req.body,
      lastEditedBy: req.user._id,
    };
    
    const page = await Page.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!page) {
      return res.status(404).json({
        status: 'error',
        message: 'Page not found',
      });
    }

    res.json({
      status: 'success',
      data: { page },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/pages/:id - Delete page
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);

    if (!page) {
      return res.status(404).json({
        status: 'error',
        message: 'Page not found',
      });
    }

    res.json({
      status: 'success',
      message: 'Page deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/pages/:id/analyze - AI-powered SEO analysis
router.post('/:id/analyze', protect, async (req, res, next) => {
  try {
    const page = await Page.findById(req.params.id);
    
    if (!page) {
      return res.status(404).json({
        status: 'error',
        message: 'Page not found',
      });
    }

    // AI analyze page SEO
    const analysis = await aiService.analyzePageSEO(page);
    
    // Update page with AI insights
    page.seo.seoScore = analysis.score;
    page.issues = analysis.issues;
    await page.save();

    res.json({
      status: 'success',
      data: { 
        page,
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/pages/:id/generate-schema - Generate JSON-LD structured data
router.post('/:id/generate-schema', protect, async (req, res, next) => {
  try {
    const page = await Page.findById(req.params.id);
    
    if (!page) {
      return res.status(404).json({
        status: 'error',
        message: 'Page not found',
      });
    }

    const { schemaType } = req.body;
    
    // Generate structured data based on type
    const schema = generateStructuredData(page, schemaType);
    
    page.structuredData.type = schemaType;
    page.structuredData.schema = schema;
    await page.save();

    res.json({
      status: 'success',
      data: { 
        page,
        schema,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/pages/:id/check-issues - Check for SEO issues
router.post('/:id/check-issues', protect, async (req, res, next) => {
  try {
    const page = await Page.findById(req.params.id);
    
    if (!page) {
      return res.status(404).json({
        status: 'error',
        message: 'Page not found',
      });
    }

    const issues = checkSEOIssues(page);
    
    page.issues = issues;
    await page.save();

    res.json({
      status: 'success',
      data: { 
        page,
        issuesCount: issues.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Helper: Generate Structured Data
function generateStructuredData(page, type) {
  const baseSchema = {
    '@context': 'https://schema.org',
  };

  switch (type) {
    case 'Article':
    case 'BlogPosting':
      return {
        ...baseSchema,
        '@type': type,
        headline: page.title,
        description: page.metaDescription,
        image: page.openGraph.image,
        datePublished: page.publishedAt,
        dateModified: page.lastModified,
        author: {
          '@type': 'Person',
          name: page.author?.name || 'Unknown',
        },
      };
      
    case 'Product':
      return {
        ...baseSchema,
        '@type': 'Product',
        name: page.title,
        description: page.metaDescription,
        image: page.openGraph.image,
      };
      
    case 'WebPage':
      return {
        ...baseSchema,
        '@type': 'WebPage',
        name: page.title,
        description: page.metaDescription,
        url: page.url,
      };
      
    case 'FAQPage':
      return {
        ...baseSchema,
        '@type': 'FAQPage',
        mainEntity: [],
      };
      
    default:
      return { ...baseSchema, '@type': type };
  }
}

// Helper: Check SEO Issues
function checkSEOIssues(page) {
  const issues = [];

  // Title checks
  if (!page.title) {
    issues.push({
      type: 'error',
      category: 'title',
      message: 'Missing page title',
      severity: 'critical',
    });
  } else if (page.title.length < 30) {
    issues.push({
      type: 'warning',
      category: 'title',
      message: 'Title is too short (less than 30 characters)',
      severity: 'medium',
    });
  } else if (page.title.length > 60) {
    issues.push({
      type: 'warning',
      category: 'title',
      message: 'Title is too long (more than 60 characters)',
      severity: 'medium',
    });
  }

  // Meta description checks
  if (!page.metaDescription) {
    issues.push({
      type: 'error',
      category: 'meta',
      message: 'Missing meta description',
      severity: 'high',
    });
  } else if (page.metaDescription.length < 120) {
    issues.push({
      type: 'warning',
      category: 'meta',
      message: 'Meta description is too short (less than 120 characters)',
      severity: 'medium',
    });
  }

  // H1 checks
  if (!page.h1) {
    issues.push({
      type: 'error',
      category: 'content',
      message: 'Missing H1 heading',
      severity: 'high',
    });
  }

  // Image alt tags
  const imagesWithoutAlt = page.images.filter(img => !img.alt);
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      type: 'warning',
      category: 'images',
      message: `${imagesWithoutAlt.length} images missing alt tags`,
      severity: 'medium',
    });
  }

  // Structured data
  if (!page.structuredData.schema || Object.keys(page.structuredData.schema).length === 0) {
    issues.push({
      type: 'info',
      category: 'technical',
      message: 'No structured data (JSON-LD) found',
      severity: 'low',
    });
  }

  // Canonical URL
  if (!page.seo.canonical) {
    issues.push({
      type: 'info',
      category: 'technical',
      message: 'No canonical URL set',
      severity: 'low',
    });
  }

  // Open Graph
  if (!page.openGraph.title || !page.openGraph.description || !page.openGraph.image) {
    issues.push({
      type: 'warning',
      category: 'meta',
      message: 'Incomplete Open Graph tags',
      severity: 'medium',
    });
  }

  return issues;
}

module.exports = router;
 
// PATCH /api/pages/:id/focus-keyword - Set focus keyword and recompute keyword-based score
router.patch('/:id/focus-keyword', protect, async (req, res, next) => {
  try {
    const { id } = req.params
    const { focusKeyword } = req.body
    if (!focusKeyword || typeof focusKeyword !== 'string') {
      return res.status(400).json({ status: 'error', message: 'focusKeyword is required' })
    }
    const page = await Page.findById(id)
    if (!page) return res.status(404).json({ status: 'error', message: 'Page not found' })

    const fk = focusKeyword.trim()
    const title = page.title || ''
    const meta = page.metaDescription || ''
    const h1 = page.h1 || ''
    const sample = page.content?.sample || ''
    const words = sample ? sample.split(/\s+/).filter(Boolean).length : 0
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${esc(fk)}\\b`, 'gi')
    const count = sample ? ((sample.match(re) || []).length) : 0
    const density = words > 0 ? (count / words) * 100 : 0

    const inTitle = title.toLowerCase().includes(fk.toLowerCase())
    const inMeta = meta.toLowerCase().includes(fk.toLowerCase())
    const inH1 = h1.toLowerCase().includes(fk.toLowerCase())
    const inContent = count > 0

    // Simple keyword score out of 100
    let score = 0
    if (inTitle) score += 40
    if (inMeta) score += 15
    if (inH1) score += 25
    if (inContent) score += 20
    // Penalize very high density
    if (density > 5) score -= Math.min(20, Math.round((density - 5)))
    score = Math.max(0, Math.min(100, score))

    // Update page
    page.seo = page.seo || {}
    page.seo.focusKeyword = fk
    page.seo.seoScore = score
    // Update keywords array entry
    const kw = {
      keyword: fk,
      density: Number(density.toFixed(2)),
      position: sample ? sample.toLowerCase().indexOf(fk.toLowerCase()) : -1,
      inTitle,
      inMeta,
      inH1,
      inUrl: (page.url || '').toLowerCase().includes(fk.toLowerCase()),
    }
    // Replace or add
    page.keywords = Array.isArray(page.keywords) ? page.keywords.filter(k => k.keyword !== fk) : []
    page.keywords.push(kw)

    await page.save()
    res.json({ status: 'success', data: { page, keyword: kw } })
  } catch (error) {
    next(error)
  }
})

// POST /api/pages/:id/refresh-content - Fetch page HTML and store content sample/word count
router.post('/:id/refresh-content', protect, async (req, res, next) => {
  try {
    const { id } = req.params
    const page = await Page.findById(id)
    if (!page) return res.status(404).json({ status: 'error', message: 'Page not found' })

    const url = page.url
    if (!url) return res.status(400).json({ status: 'error', message: 'Page URL missing' })

    const response = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Tool/1.0)' } })
    const $ = cheerio.load(response.data)

    // Extract text sample and word count
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
    const blocks = []
    $('h1, h2, h3, h4, h5, h6, p, li').each((i, el) => {
      if (blocks.length >= 50) return false
      const tag = el.tagName ? String(el.tagName).toLowerCase() : $(el).get(0)?.tagName?.toLowerCase()
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (!text || text.length < 2) return
      blocks.push({ tag, text })
    })
    const sampleText = (blocks.map(b => b.text).join(' ').trim() || bodyText).substring(0, 2000)
    const wordCount = (sampleText ? sampleText.split(/\s+/).filter(Boolean).length : 0)

    // Try to infer some basics if missing
    const h1 = page.h1 || $('h1').first().text().trim()
    const metaDescription = page.metaDescription || $('meta[name="description"]').attr('content') || ''

  page.content = page.content || {}
  page.content.sample = sampleText
  page.content.wordCount = wordCount
  page.content.blocks = blocks
    if (!page.h1 && h1) page.h1 = h1
    if (!page.metaDescription && metaDescription) page.metaDescription = metaDescription
    await page.save()

    res.json({ status: 'success', data: { page } })
  } catch (error) {
    next(error)
  }
})
