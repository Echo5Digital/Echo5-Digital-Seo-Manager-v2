const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Blog = require('../models/Blog.model');
const Client = require('../models/Client.model');
const Notification = require('../models/Notification.model');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { normalizeTitle } = require('../utils/titleNormalizer');
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
      .populate('assignedTo', 'name email role')
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
      .populate('assignedTo', 'name email role')
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
 * @route   POST /api/blogs/check-title
 * @desc    Check if a title is available (not duplicate) for a client
 * @access  Private
 */
router.post(
  '/check-title',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('clientId').notEmpty().withMessage('Client ID is required')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { title, clientId, excludeBlogId } = req.body;
      
      const normalizedNewTitle = normalizeTitle(title);
      const query = {
        clientId,
        normalizedTitle: normalizedNewTitle
      };
      
      // Exclude specific blog ID if updating
      if (excludeBlogId) {
        query._id = { $ne: excludeBlogId };
      }
      
      const existingBlog = await Blog.findOne(query).select('title createdAt');
      
      if (existingBlog) {
        return res.json({
          status: 'success',
          data: {
            available: false,
            duplicate: true,
            existingTitle: existingBlog.title,
            createdAt: existingBlog.createdAt,
            message: 'A blog with a similar title already exists for this client'
          }
        });
      }
      
      res.json({
        status: 'success',
        data: {
          available: true,
          duplicate: false,
          message: 'Title is available'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

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
        clientId,
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
      
      // Check for duplicate title for this client
      const normalizedNewTitle = normalizeTitle(req.body.title);
      const existingBlog = await Blog.findOne({
        clientId: req.body.clientId,
        normalizedTitle: normalizedNewTitle,
        _id: { $ne: req.body._id } // Exclude current blog if updating
      });
      
      if (existingBlog) {
        return res.status(409).json({
          status: 'error',
          message: 'A blog with a similar title already exists for this client. Please choose a different title.',
          existingTitle: existingBlog.title
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
    
    const oldStatus = blog.status;
    
    // Check for duplicate title if title is being changed
    if (req.body.title && req.body.title !== blog.title) {
      const normalizedNewTitle = normalizeTitle(req.body.title);
      const existingBlog = await Blog.findOne({
        clientId: blog.clientId,
        normalizedTitle: normalizedNewTitle,
        _id: { $ne: blog._id }
      });
      
      if (existingBlog) {
        return res.status(409).json({
          status: 'error',
          message: 'A blog with a similar title already exists for this client. Please choose a different title.',
          existingTitle: existingBlog.title
        });
      }
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
    await blog.populate('assignedTo', 'name email role');
    await blog.populate('lastModifiedBy', 'name email');

    // Create notification if status changed and blog is assigned
    if (req.body.status && req.body.status !== oldStatus) {
      // Notify creator when status changes to review or published
      if ((req.body.status === 'review' || req.body.status === 'published') && 
          blog.createdBy && blog.createdBy._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          userId: blog.createdBy._id,
          type: 'Task Update',
          title: 'Blog Brief Updated',
          message: `Blog brief "${blog.title}" status changed to ${req.body.status}`,
          priority: req.body.status === 'published' ? 'High' : 'Medium',
          relatedModel: 'Blog',
          relatedId: blog._id,
          actionUrl: '/briefs',
        });
      }
      
      // Notify assigned writer when status changes
      if (blog.assignedTo && blog.assignedTo._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          userId: blog.assignedTo._id,
          type: 'Task Update',
          title: 'Blog Brief Status Changed',
          message: `Blog brief "${blog.title}" status changed to ${req.body.status}`,
          priority: 'Medium',
          relatedModel: 'Blog',
          relatedId: blog._id,
          actionUrl: '/briefs',
        });
      }
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
    const blog = await Blog.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email role');
    
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

    // Notify creator when blog is published
    if (blog.createdBy && blog.createdBy._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        userId: blog.createdBy._id,
        type: 'Task Update',
        title: 'Blog Brief Published',
        message: `Blog brief "${blog.title}" has been published`,
        priority: 'High',
        relatedModel: 'Blog',
        relatedId: blog._id,
        actionUrl: '/briefs',
      });
    }

    // Notify assigned writer when blog is published
    if (blog.assignedTo && blog.assignedTo._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        userId: blog.assignedTo._id,
        type: 'Task Update',
        title: 'Blog Brief Published',
        message: `Blog brief "${blog.title}" has been published`,
        priority: 'High',
        relatedModel: 'Blog',
        relatedId: blog._id,
        actionUrl: '/briefs',
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
 * @route   PUT /api/blogs/:id/assign
 * @desc    Assign a blog to a staff member
 * @access  Private (Boss/Manager/Admin only)
 */
router.put('/:id/assign', protect, async (req, res, next) => {
  try {
    // Check if user has permission to assign
    if (!['Boss', 'Manager', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to assign blogs'
      });
    }

    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a user ID to assign to'
      });
    }

    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }

    blog.assignedTo = assignedTo;
    blog.lastModifiedBy = req.user._id;
    
    await blog.save();
    await blog.populate('assignedTo', 'name email role');
    await blog.populate('clientId', 'name website');

    // Create notification for assigned user
    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      await Notification.create({
        userId: assignedTo,
        type: 'Task Assigned',
        title: 'Blog Brief Assigned',
        message: `You have been assigned a blog brief: "${blog.title}"`,
        priority: 'Medium',
        relatedModel: 'Blog',
        relatedId: blog._id,
        actionUrl: '/briefs',
      });
    }

    res.json({
      status: 'success',
      message: 'Blog assigned successfully',
      data: { blog }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/blogs/:id/unassign
 * @desc    Unassign a blog from a staff member
 * @access  Private (Boss/Manager/Admin only)
 */
router.put('/:id/unassign', protect, async (req, res, next) => {
  try {
    // Check if user has permission to unassign
    if (!['Boss', 'Manager', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to unassign blogs'
      });
    }

    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }

    blog.assignedTo = null;
    blog.lastModifiedBy = req.user._id;
    
    await blog.save();
    await blog.populate('clientId', 'name website');

    res.json({
      status: 'success',
      message: 'Blog unassigned successfully',
      data: { blog }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
