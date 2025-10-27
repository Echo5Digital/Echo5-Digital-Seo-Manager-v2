const express = require('express');
const router = express.Router();
const Page = require('../models/Page.model');
const { protect } = require('../middleware/auth');
const aiService = require('../services/ai.service');
const { default: mongoose } = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const Audit = require('../models/Audit.model');
const auditService = require('../services/audit.service');

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

    // Remove scripts, styles, and other non-content elements
    $('script, style, noscript, iframe, svg').remove()

    // Extract internal links with anchor text
    const internalLinks = []
    const pageHost = (() => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, '') } catch { return '' } })()
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href')
      const anchorText = $(el).text().replace(/\s+/g, ' ').trim()
      const rel = $(el).attr('rel') || ''
      if (!href || !anchorText) return
      try {
        const absoluteUrl = new URL(href, url).href
        const linkHost = new URL(absoluteUrl).hostname.toLowerCase().replace(/^www\./, '')
        if (linkHost === pageHost && !absoluteUrl.includes('#') && internalLinks.length < 100) {
          internalLinks.push({
            url: absoluteUrl,
            anchorText: anchorText.substring(0, 200),
            isNofollow: rel.includes('nofollow')
          })
        }
      } catch {}
    })

    // Extract text sample and word count from clean content
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
    const blocks = []
    $('h1, h2, h3, h4, h5, h6, p, li').each((i, el) => {
      if (blocks.length >= 50) return false
      const tag = el.tagName ? String(el.tagName).toLowerCase() : $(el).get(0)?.tagName?.toLowerCase()
      let text = $(el).text().replace(/\s+/g, ' ').trim()
      // Remove CSS class names, Elementor markup, and WordPress artifacts
      text = text.replace(/\.elementor-[^\s]+/g, '')
                 .replace(/\.wpr-[^\s]+/g, '')
                 .replace(/\{[^}]*\}/g, '')
                 .replace(/--[a-z-]+:[^;]+;/g, '')
                 .replace(/@media[^{]+\{[^}]*\}/g, '')
                 .replace(/\s+/g, ' ')
                 .trim()
      if (!text || text.length < 3) return
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
    page.content.internalLinks = internalLinks
    if (!page.h1 && h1) page.h1 = h1
    if (!page.metaDescription && metaDescription) page.metaDescription = metaDescription
    await page.save()

    res.json({ status: 'success', data: { page } })
  } catch (error) {
    next(error)
  }
})

// POST /api/pages/sync-from-audits?clientId=... - Repersist pages from the latest completed audit
router.post('/sync-from-audits', protect, async (req, res, next) => {
  try {
    const clientId = req.query.clientId || req.body.clientId
    if (!clientId) return res.status(400).json({ status: 'error', message: 'clientId is required' })
    const audit = await Audit.findOne({ clientId }).sort('-completedAt')
    if (!audit || audit.status !== 'Completed') {
      return res.status(404).json({ status: 'error', message: 'No completed audit found to sync from' })
    }
    await auditService.persistPages(audit, clientId)
    const count = await Page.countDocuments({ clientId })
    res.json({ status: 'success', data: { synced: true, pagesCount: count } })
  } catch (error) {
    next(error)
  }
})

// POST /api/pages/:id/recrawl - Recrawl a specific page and update all its data
router.post('/:id/recrawl', protect, async (req, res, next) => {
  try {
    const { id } = req.params
    const page = await Page.findById(id)
    if (!page) return res.status(404).json({ status: 'error', message: 'Page not found' })

    const url = page.url
    if (!url) return res.status(400).json({ status: 'error', message: 'Page URL missing' })

    // Use audit service to analyze this page comprehensively
    const baseUrl = (() => { try { const u = new URL(url); return `${u.protocol}//${u.host}` } catch { return url } })()
    const analysis = await auditService.analyzePageSEO(url, baseUrl)

    // Update page with fresh data from analysis
    const meta = analysis.metaData || {}
    const social = analysis.socialTags || {}
    const headings = analysis.headings || {}
    const images = analysis.images || {}
    const content = analysis.content || {}

    page.title = (meta.title?.text || page.title || 'Untitled').substring(0, 60)
    page.metaDescription = (meta.description?.text || '').substring(0, 160)
    page.h1 = Array.isArray(headings.h1Text) ? (headings.h1Text[0] || '') : ''
    
    page.seo = page.seo || {}
    page.seo.canonical = meta.canonical || undefined
    page.seo.robots = meta.robots || 'index,follow'
    page.seo.seoScore = analysis.seoAnalysis?.seoScore ?? undefined

    page.structuredData = page.structuredData || {}
    page.structuredData.type = (analysis.structuredData?.types && analysis.structuredData.types[0]) || 'WebPage'
    page.structuredData.schema = (analysis.structuredData?.data && analysis.structuredData.data[0]) || {}

    page.openGraph = {
      title: social?.openGraph?.title || '',
      description: social?.openGraph?.description || '',
      image: social?.openGraph?.image || '',
      url,
      type: social?.openGraph?.type || 'website',
      siteName: social?.openGraph?.siteName || '',
    }

    page.twitter = {
      card: social?.twitter?.card || 'summary_large_image',
      title: social?.twitter?.title || '',
      description: social?.twitter?.description || '',
      image: social?.twitter?.image || '',
      site: social?.twitter?.site || '',
      creator: '',
    }

    page.content = page.content || {}
    page.content.wordCount = content.wordCount || 0
    page.content.readingTime = content.wordCount ? Math.max(1, Math.round(content.wordCount / 200)) : undefined
    page.content.paragraphs = content.paragraphs || undefined
    page.content.headings = {
      h1Count: headings.h1Count || 0,
      h2Count: Array.isArray(headings.structure) ? headings.structure.filter(h=>h.level===2).length : undefined,
      h3Count: Array.isArray(headings.structure) ? headings.structure.filter(h=>h.level===3).length : undefined,
    }
    page.content.links = {
      internal: analysis.links?.internal?.count || 0,
      external: analysis.links?.external?.count || 0,
      broken: analysis.links?.potentiallyBroken || 0,
    }
    page.content.sample = content.sampleText || undefined

    page.images = (images.details || []).map(img => ({
      url: img.src,
      alt: img.alt || '',
      width: (img.width && Number(img.width)) || undefined,
      height: (img.height && Number(img.height)) || undefined,
      optimized: !!img.hasLazyLoading,
    }))

    page.technical = {
      hasSSL: /^https:/i.test(url),
      isMobileFriendly: !!meta.viewport,
      hasViewport: !!meta.viewport,
      hasLanguage: !!meta.lang,
      hasCharset: !!meta.charset,
      responsiveImages: (images.withDimensions || 0) > 0,
      lazyLoading: (images.withLazyLoading || 0) > 0,
    }

    await page.save()

    res.json({ status: 'success', data: { page } })
  } catch (error) {
    next(error)
  }
})
