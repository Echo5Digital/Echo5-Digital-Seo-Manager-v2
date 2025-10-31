const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Blog = require('../models/Blog.model');
const Client = require('../models/Client.model');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { 
  generateBlogTitles, 
  generateBlogContent, 
  generateFAQs,
  generateSemanticKeywords,
  generateImageAltTexts,
  extractInternalLinks
} = require('../services/ai.service');

/**
 * @route   GET /api/blogs
 * @desc    Get all blogs (with filters)
 * @access  Private
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const { clientId, status, keyword } = req.query;
    const filter = {};
    
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;
    if (keyword) filter.focusKeyword = new RegExp(keyword, 'i');
    
    const blogs = await Blog.find(filter)
      .populate('clientId', 'name website domain')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      status: 'success',
      results: blogs.length,
      data: { blogs }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/blogs/:id
 * @desc    Get single blog by ID
 * @access  Private
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('clientId', 'name website domain logo')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }
    
    res.json({
      status: 'success',
      data: { blog }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/blogs/generate-titles
 * @desc    Generate 10 blog title suggestions based on keyword
 * @access  Private
 */
router.post(
  '/generate-titles',
  protect,
  [
    body('keyword').trim().notEmpty().withMessage('Keyword is required'),
    body('clientId').notEmpty().withMessage('Client ID is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { keyword, clientId, industry, tone } = req.body;
      
      // Get client info for context
      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({
          status: 'error',
          message: 'Client not found'
        });
      }
      
      const titles = await generateBlogTitles({
        keyword,
        industry: industry || client.industry,
        clientName: client.name,
        tone: tone || 'professional'
      });
      
      res.json({
        status: 'success',
        data: { titles }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/blogs/generate-content
 * @desc    Generate full blog post content
 * @access  Private
 */
router.post(
  '/generate-content',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('focusKeyword').trim().notEmpty().withMessage('Focus keyword is required'),
    body('clientId').notEmpty().withMessage('Client ID is required'),
    body('wordCount').isInt({ min: 300, max: 5000 }).withMessage('Word count must be between 300 and 5000')
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        title,
        focusKeyword,
        secondaryKeywords,
        clientId,
        wordCount,
        tone,
        faqCount,
        includeInternalLinks
      } = req.body;
      
      // Get client info
      const client = await Client.findById(clientId)
        .populate('assignedStaff', 'name email');
      
      if (!client) {
        return res.status(404).json({
          status: 'error',
          message: 'Client not found'
        });
      }
      
      // Generate semantic keywords
      const semanticKeywords = await generateSemanticKeywords(focusKeyword);
      
      // Generate blog content
      const blogData = await generateBlogContent({
        title,
        focusKeyword,
        secondaryKeywords: secondaryKeywords || [],
        semanticKeywords,
        wordCount,
        tone: tone || 'professional',
        industry: client.industry,
        clientName: client.name,
        clientWebsite: client.website
      });
      
      // Generate FAQs
      const faqs = await generateFAQs({
        topic: title,
        keyword: focusKeyword,
        count: faqCount || 5
      });
      
      // Generate image alt texts
      const imageAlts = await generateImageAltTexts({
        keyword: focusKeyword,
        title,
        count: 3
      });
      
      // Extract/suggest internal links if client has pages
      let internalLinks = [];
      if (includeInternalLinks && client.website) {
        internalLinks = await extractInternalLinks({
          clientWebsite: client.website,
          keyword: focusKeyword,
          content: blogData.content
        });
      }
      
      // Generate slug
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Generate meta title (max 60 chars)
      const metaTitle = title.length > 60 
        ? `${title.substring(0, 57)}...` 
        : title;
      
      res.json({
        status: 'success',
        data: {
          content: blogData.content,
          headings: blogData.headings,
          slug,
          metaTitle,
          metaDescription: blogData.metaDescription,
          faqs,
          semanticKeywords: blogData.semanticKeywordsUsed || semanticKeywords,
          imageAlts,
          internalLinks,
          wordCount: blogData.wordCount
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/blogs
 * @desc    Create a new blog post
 * @access  Private
 */
router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('clientId').notEmpty().withMessage('Client ID is required'),
    body('focusKeyword').trim().notEmpty().withMessage('Focus keyword is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('metaTitle').trim().notEmpty().withMessage('Meta title is required'),
    body('metaDescription').trim().notEmpty().withMessage('Meta description is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const blogData = {
        ...req.body,
        createdBy: req.user._id
      };
      
      // Get client to populate data for schema generation
      const client = await Client.findById(req.body.clientId);
      
      if (!client) {
        return res.status(404).json({
          status: 'error',
          message: 'Client not found'
        });
      }
      
      const blog = await Blog.create(blogData);
      
      // Populate client data for schema generation
      await blog.populate('clientId', 'name website domain logo');
      await blog.populate('createdBy', 'name email');
      
      // Generate and save schemas with populated data
      blog.schemas = {
        article: blog.generateArticleSchema(),
        faq: blog.generateFAQSchema(),
        breadcrumb: blog.generateBreadcrumbSchema()
      };
      
      // Save schemas
      await blog.save();
      
      res.status(201).json({
        status: 'success',
        data: { blog }
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          status: 'error',
          message: 'A blog with this slug already exists'
        });
      }
      next(error);
    }
  }
);

/**
 * @route   PUT /api/blogs/:id
 * @desc    Update a blog post
 * @access  Private
 */
router.put('/:id', protect, async (req, res, next) => {
  try {
    let blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }
    
    // Update fields
    Object.assign(blog, req.body);
    blog.lastModifiedBy = req.user._id;
    
    // Populate client data before generating schemas
    await blog.populate('clientId', 'name website domain logo');
    
    // Always regenerate schemas on update to ensure they're current
    blog.schemas = {
      article: blog.generateArticleSchema(),
      faq: blog.generateFAQSchema(),
      breadcrumb: blog.generateBreadcrumbSchema()
    };
    
    await blog.save();
    
    await blog.populate('createdBy', 'name email');
    await blog.populate('lastModifiedBy', 'name email');
    
    res.json({
      status: 'success',
      data: { blog }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/blogs/:id
 * @desc    Delete a blog post
 * @access  Private
 */
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/blogs/:id/publish
 * @desc    Publish a blog post
 * @access  Private
 */
router.put('/:id/publish', protect, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }
    
    blog.status = 'published';
    blog.publishedAt = new Date();
    blog.lastModifiedBy = req.user._id;
    
    await blog.save();
    
    res.json({
      status: 'success',
      data: { blog }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
