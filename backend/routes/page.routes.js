const express = require('express');
const router = express.Router();
const Page = require('../models/Page.model');
const Client = require('../models/Client.model');
const Keyword = require('../models/Keyword.model');
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
    
    const filter = { excluded: { $ne: true } }; // Exclude pages marked as excluded
    if (clientId) filter.clientId = clientId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    // If user is Staff, only show pages for assigned clients
    if (req.user.role === 'Staff') {
      const Client = require('../models/Client.model');
      const assignedClients = await Client.find({ assignedStaff: req.user._id, isActive: true }).select('_id');
      const clientIds = assignedClients.map(c => c._id);
      
      if (clientId) {
        // Check if the requested client is assigned to this staff
        if (!clientIds.some(id => id.toString() === clientId)) {
          return res.status(403).json({
            status: 'error',
            message: 'Not authorized to access this client\'s pages'
          });
        }
      } else {
        // Only show pages for assigned clients
        filter.clientId = { $in: clientIds };
      }
    }
    
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
    
    // If user is Staff, check if they have access to this page's client
    if (req.user.role === 'Staff') {
      const Client = require('../models/Client.model');
      const client = await Client.findById(page.clientId._id);
      
      if (!client || !client.assignedStaff.some(staffId => staffId.toString() === req.user._id.toString())) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to access this page'
        });
      }
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

// POST /api/pages/:id/suggest-fixes - Generate AI-powered SEO fix suggestions
router.post('/:id/suggest-fixes', protect, async (req, res, next) => {
  try {
    const page = await Page.findById(req.params.id).populate('clientId', 'name domain');
    if (!page) {
      return res.status(404).json({ status: 'error', message: 'Page not found' });
    }

    // Get the SEO report from request body (should be passed from frontend)
    const { seoReport } = req.body;
    
    if (!seoReport) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'SEO report required. Please run SEO check first.' 
      });
    }

    // Generate AI-powered fix suggestions
    const suggestions = await aiService.generateSEOFixSuggestions(
      {
        title: page.title,
        slug: page.slug,
        url: page.url,
        metaDescription: page.metaDescription,
        h1: page.h1,
        seo: page.seo,
        content: page.content,
        images: page.images,
        openGraph: page.openGraph,
        twitter: page.twitter,
        structuredData: page.structuredData,
      },
      seoReport
    );

    res.json({
      status: 'success',
      data: { 
        suggestions,
        pageId: page._id,
        pageTitle: page.title,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/pages/:id/exclude - Toggle page exclusion status
router.patch('/:id/exclude', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { excluded } = req.body;
    
    const page = await Page.findById(id);
    if (!page) {
      return res.status(404).json({ status: 'error', message: 'Page not found' });
    }
    
    page.excluded = excluded !== undefined ? excluded : !page.excluded;
    await page.save();
    
    res.json({
      status: 'success',
      data: { page },
    });
  } catch (error) {
    next(error);
  }
});

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
    
    // Create or update primary keyword for the client
    if (page.clientId) {
      try {
        // Check if this keyword already exists for the client
        let keyword = await Keyword.findOne({ 
          clientId: page.clientId, 
          keyword: fk 
        });
        
        if (keyword) {
          // Keyword already exists - just log
          console.log(`✅ Keyword "${fk}" already exists for client`);
        } else {
          // Create new primary keyword with correct schema fields
          keyword = await Keyword.create({
            clientId: page.clientId,
            keyword: fk,
            keywordType: 'Primary',
            targetUrl: page.url || '',
            status: 'Active',
            tags: ['Priority'],
            volume: 0,
            competition: 'Medium',
            intent: 'Informational',
            addedBy: req.user._id
          });
          
          // Also add to client's primaryKeywords array
          await Client.findByIdAndUpdate(
            page.clientId,
            { 
              $addToSet: { 
                primaryKeywords: {
                  keyword: fk,
                  priority: 1,
                  targetLocation: '',
                  notes: `Auto-created from page: ${page.url || page.title}`
                }
              }
            }
          );
          
          console.log(`✅ Created new primary keyword "${fk}" for client`);
        }
      } catch (keywordError) {
        console.error('Error creating/updating keyword:', keywordError);
        // Don't fail the whole request if keyword creation fails
      }
    }
    
    res.json({ status: 'success', data: { page, keyword: kw } })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/pages/:id/secondary-keywords - Set secondary keywords
router.patch('/:id/secondary-keywords', protect, async (req, res, next) => {
  try {
    const { id } = req.params
    const { secondaryKeywords } = req.body
    
    if (!Array.isArray(secondaryKeywords)) {
      return res.status(400).json({ status: 'error', message: 'secondaryKeywords must be an array' })
    }
    
    const page = await Page.findById(id)
    if (!page) return res.status(404).json({ status: 'error', message: 'Page not found' })

    page.seo = page.seo || {}
    page.seo.secondaryKeywords = secondaryKeywords.filter(k => k && k.trim()).map(k => k.trim())
    
    await page.save()
    res.json({ status: 'success', data: { page } })
  } catch (error) {
    next(error)
  }
})

// POST /api/pages/:id/check-seo - Comprehensive SEO check based on all SEO concepts
router.post('/:id/check-seo', protect, async (req, res, next) => {
  try {
    const { id } = req.params
    const page = await Page.findById(id)
    if (!page) return res.status(404).json({ status: 'error', message: 'Page not found' })

    // Run comprehensive SEO checks
    const issues = []
    const checks = []
    const recommendations = []

    // 1. Title SEO
    if (!page.title) {
      issues.push({ category: 'Title', severity: 'critical', message: 'Missing page title', impact: 'high' })
    } else {
      if (page.title.length < 30) {
        issues.push({ category: 'Title', severity: 'high', message: `Title too short (${page.title.length} chars, recommended 30-60)`, impact: 'medium' })
      } else if (page.title.length > 60) {
        issues.push({ category: 'Title', severity: 'medium', message: `Title too long (${page.title.length} chars, recommended 30-60)`, impact: 'medium' })
      } else {
        checks.push({ category: 'Title', status: 'pass', message: `Title length optimal (${page.title.length} chars)` })
      }
      
      // Check for focus keyword in title
      if (page.seo?.focusKeyword) {
        const fk = page.seo.focusKeyword.toLowerCase()
        if (page.title.toLowerCase().includes(fk)) {
          checks.push({ category: 'Title', status: 'pass', message: 'Focus keyword found in title' })
        } else {
          recommendations.push({ category: 'Title', message: `Add focus keyword "${page.seo.focusKeyword}" to title` })
        }
      }
    }

    // 2. Meta Description SEO
    if (!page.metaDescription) {
      issues.push({ category: 'Meta', severity: 'high', message: 'Missing meta description', impact: 'high' })
    } else {
      if (page.metaDescription.length < 120) {
        issues.push({ category: 'Meta', severity: 'medium', message: `Meta description too short (${page.metaDescription.length} chars, recommended 120-160)`, impact: 'medium' })
      } else if (page.metaDescription.length > 160) {
        issues.push({ category: 'Meta', severity: 'low', message: `Meta description too long (${page.metaDescription.length} chars, recommended 120-160)`, impact: 'low' })
      } else {
        checks.push({ category: 'Meta', status: 'pass', message: `Meta description length optimal (${page.metaDescription.length} chars)` })
      }

      // Check for focus keyword in meta
      if (page.seo?.focusKeyword) {
        const fk = page.seo.focusKeyword.toLowerCase()
        if (page.metaDescription.toLowerCase().includes(fk)) {
          checks.push({ category: 'Meta', status: 'pass', message: 'Focus keyword found in meta description' })
        } else {
          recommendations.push({ category: 'Meta', message: `Add focus keyword "${page.seo.focusKeyword}" to meta description` })
        }
      }
    }

    // 3. H1 Heading SEO
    if (!page.h1) {
      issues.push({ category: 'Content', severity: 'high', message: 'Missing H1 heading', impact: 'high' })
    } else {
      checks.push({ category: 'Content', status: 'pass', message: 'H1 heading present' })
      
      // Check for focus keyword in H1
      if (page.seo?.focusKeyword) {
        const fk = page.seo.focusKeyword.toLowerCase()
        if (page.h1.toLowerCase().includes(fk)) {
          checks.push({ category: 'Content', status: 'pass', message: 'Focus keyword found in H1' })
        } else {
          recommendations.push({ category: 'Content', message: `Add focus keyword "${page.seo.focusKeyword}" to H1 heading` })
        }
      }
    }

    // 4. Content Quality
    const wordCount = page.content?.wordCount || 0
    if (wordCount === 0) {
      issues.push({ category: 'Content', severity: 'critical', message: 'No content found on page', impact: 'high' })
    } else if (wordCount < 300) {
      issues.push({ category: 'Content', severity: 'medium', message: `Low word count (${wordCount} words, recommended 300+)`, impact: 'medium' })
    } else {
      checks.push({ category: 'Content', status: 'pass', message: `Good word count (${wordCount} words)` })
    }

    // 5. Keyword Density (if focus keyword set)
    if (page.seo?.focusKeyword && page.content?.sample) {
      const fk = page.seo.focusKeyword.trim()
      const sample = page.content.sample
      const words = sample.split(/\s+/).filter(Boolean).length
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`\\b${esc(fk)}\\b`, 'gi')
      const count = (sample.match(re) || []).length
      const density = words > 0 ? (count / words) * 100 : 0

      if (density === 0) {
        issues.push({ category: 'Keywords', severity: 'high', message: `Focus keyword "${fk}" not found in content`, impact: 'high' })
      } else if (density < 0.5) {
        recommendations.push({ category: 'Keywords', message: `Low keyword density (${density.toFixed(2)}%, recommended 0.5-2.5%)` })
      } else if (density > 2.5) {
        issues.push({ category: 'Keywords', severity: 'medium', message: `Keyword density too high (${density.toFixed(2)}%, may be keyword stuffing)`, impact: 'medium' })
      } else {
        checks.push({ category: 'Keywords', status: 'pass', message: `Optimal keyword density (${density.toFixed(2)}%)` })
      }
    }

    // 6. Images & Alt Tags
    const totalImages = Array.isArray(page.images) ? page.images.length : 0
    const imagesWithoutAlt = totalImages > 0 ? page.images.filter(img => !img.alt || img.alt.trim() === '').length : 0
    
    if (totalImages === 0) {
      recommendations.push({ category: 'Images', message: 'No images found - consider adding relevant images' })
    } else {
      if (imagesWithoutAlt > 0) {
        issues.push({ category: 'Images', severity: 'medium', message: `${imagesWithoutAlt} of ${totalImages} images missing alt tags`, impact: 'medium' })
      } else {
        checks.push({ category: 'Images', status: 'pass', message: `All ${totalImages} images have alt tags` })
      }
    }

    // 7. Internal Links
    const internalLinks = page.content?.links?.internal || 0
    if (internalLinks === 0) {
      recommendations.push({ category: 'Links', message: 'No internal links found - add links to related pages' })
    } else if (internalLinks < 3) {
      recommendations.push({ category: 'Links', message: `Only ${internalLinks} internal links - consider adding more (3-10 recommended)` })
    } else {
      checks.push({ category: 'Links', status: 'pass', message: `Good internal linking (${internalLinks} links)` })
    }

    // 8. External Links
    const externalLinks = page.content?.links?.external || 0
    if (externalLinks > 0) {
      checks.push({ category: 'Links', status: 'pass', message: `${externalLinks} external links for authority` })
    }

    // 9. Technical SEO
    if (!page.seo?.canonical) {
      recommendations.push({ category: 'Technical', message: 'Set canonical URL to avoid duplicate content' })
    } else {
      checks.push({ category: 'Technical', status: 'pass', message: 'Canonical URL set' })
    }

    const robots = page.seo?.robots || 'index,follow'
    if (robots.includes('noindex')) {
      issues.push({ category: 'Technical', severity: 'critical', message: 'Page set to noindex - will not appear in search results', impact: 'critical' })
    } else {
      checks.push({ category: 'Technical', status: 'pass', message: 'Page is indexable' })
    }

    if (page.technical?.https === false) {
      issues.push({ category: 'Technical', severity: 'high', message: 'Page not served over HTTPS', impact: 'high' })
    } else if (page.technical?.https === true) {
      checks.push({ category: 'Technical', status: 'pass', message: 'Page served over HTTPS' })
    }

    if (page.technical?.mobile) {
      checks.push({ category: 'Technical', status: 'pass', message: 'Mobile-friendly viewport configured' })
    } else {
      issues.push({ category: 'Technical', severity: 'medium', message: 'Missing mobile viewport meta tag', impact: 'medium' })
    }

    // 10. Structured Data
    const hasStructuredData = page.structuredData?.schema && Object.keys(page.structuredData.schema).length > 0
    if (!hasStructuredData) {
      recommendations.push({ category: 'Technical', message: 'Add structured data (JSON-LD) for rich snippets' })
    } else {
      checks.push({ category: 'Technical', status: 'pass', message: 'Structured data implemented' })
    }

    // 11. Open Graph
    const hasOG = page.openGraph?.title && page.openGraph?.description
    if (!hasOG) {
      recommendations.push({ category: 'Social', message: 'Add Open Graph tags for better social sharing' })
    } else {
      checks.push({ category: 'Social', status: 'pass', message: 'Open Graph tags configured' })
      if (!page.openGraph.image) {
        recommendations.push({ category: 'Social', message: 'Add Open Graph image for social sharing preview' })
      }
    }

    // 12. Twitter Cards
    const hasTwitter = page.twitter?.card && page.twitter?.title
    if (!hasTwitter) {
      recommendations.push({ category: 'Social', message: 'Add Twitter Card tags for better Twitter sharing' })
    } else {
      checks.push({ category: 'Social', status: 'pass', message: 'Twitter Card tags configured' })
    }

    // Calculate overall SEO score
    const totalChecks = checks.length
    const criticalIssues = issues.filter(i => i.severity === 'critical').length
    const highIssues = issues.filter(i => i.severity === 'high').length
    const mediumIssues = issues.filter(i => i.severity === 'medium').length
    const lowIssues = issues.filter(i => i.severity === 'low').length

    // Scoring: start at 100, deduct points for issues
    let score = 100
    score -= criticalIssues * 25
    score -= highIssues * 15
    score -= mediumIssues * 8
    score -= lowIssues * 3
    score = Math.max(0, Math.min(100, score))

    // Update page with new score if it changed
    if (page.seo?.seoScore !== score) {
      page.seo = page.seo || {}
      page.seo.seoScore = score
      await page.save()
    }

    res.json({
      status: 'success',
      data: {
        page,
        seoReport: {
          score,
          issues,
          checks,
          recommendations,
          summary: {
            totalIssues: issues.length,
            criticalIssues,
            highIssues,
            mediumIssues,
            lowIssues,
            passedChecks: checks.length,
            recommendations: recommendations.length
          }
        }
      }
    })
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

    // Add random delay to avoid rate limiting
    const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    // Rotating user agents
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const response = await axios.get(url, { 
      timeout: 15000, 
      headers: { 
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      } 
    })
    const $ = cheerio.load(response.data)

    // Remove scripts, styles, and other non-content elements
    $('script, style, noscript, iframe, svg').remove()
    // Remove navigation menus, headers, footers, sidebars
    $('nav, header, footer, aside, [role="navigation"], [class*="menu"], [class*="nav"], [id*="menu"], [id*="nav"]').remove()

    // Extract text sample and word count from clean content
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
    const blocks = []
    $('h1, h2, h3, h4, h5, h6, p').each((i, el) => {
      if (blocks.length >= 50) return false
      const tag = el.tagName ? String(el.tagName).toLowerCase() : $(el).get(0)?.tagName?.toLowerCase()
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (!text || text.length < 10) return // Skip very short text
      blocks.push({ tag, text })
    })
    const sampleText = (blocks.map(b => b.text).join(' ').trim() || bodyText).substring(0, 2000)
    const wordCount = (sampleText ? sampleText.split(/\s+/).filter(Boolean).length : 0)

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

    // Extract H1 and meta description
    const h1 = $('h1').first().text().trim()
    const metaDescription = ($('meta[name="description"]').attr('content') || '').substring(0, 160)

    page.content = page.content || {}
    page.content.sample = sampleText
    page.content.wordCount = wordCount
    page.content.blocks = blocks
    page.content.internalLinks = internalLinks
    
    // Always update H1 and meta description if found
    if (h1) page.h1 = h1
    if (metaDescription && !page.metaDescription) page.metaDescription = metaDescription
    
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

    page.title = (meta.title?.text || page.title || 'Untitled').substring(0, 200)
    page.metaDescription = (meta.description?.text || '').substring(0, 160)
    page.h1 = Array.isArray(headings.h1Text) ? (headings.h1Text[0] || '') : ''
    
    page.seo = page.seo || {}
    page.seo.canonical = meta.canonical || undefined
    page.seo.robots = meta.robots || 'index,follow'
    page.seo.seoScore = analysis.seoAnalysis?.seoScore ?? undefined

    page.structuredData = page.structuredData || {}
    const allowedStructuredDataTypes = [
      'Article', 'BlogPosting', 'Product', 'Organization', 'WebPage', 
      'FAQPage', 'HowTo', 'Recipe', 'Event', 'LocalBusiness', 
      'BreadcrumbList', 'Service', 'Person', 'VideoObject', 'ImageObject'
    ]
    const detectedType = (analysis.structuredData?.types && analysis.structuredData.types[0]) || 'WebPage'
    page.structuredData.type = allowedStructuredDataTypes.includes(detectedType) ? detectedType : 'WebPage'
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
