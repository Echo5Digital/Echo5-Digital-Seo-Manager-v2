const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Client = require('../models/Client.model');
const User = require('../models/User.model');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const aiService = require('../services/ai.service');

/**
 * @route   GET /api/clients
 * @desc    Get all clients (Boss sees all, Staff sees assigned only)
 * @access  Private
 */
router.get('/', protect, async (req, res, next) => {
  try {
    let query = { isActive: true };

    console.log('📋 GET /api/clients - User:', req.user.email, 'Role:', req.user.role);

    // If user is Staff, only show assigned clients
    if (req.user.role === 'Staff') {
      query.assignedStaff = req.user._id;
      console.log('🔍 Staff user querying clients:', {
        userId: req.user._id,
        userEmail: req.user.email,
        query
      });
      
      // Debug: Check all clients and their assignedStaff
      const allClients = await Client.find({ isActive: true }).select('name assignedStaff');
      console.log('📋 All active clients:', allClients.map(c => ({
        name: c.name,
        id: c._id,
        assignedStaff: c.assignedStaff
      })));
    }

    const clients = await Client.find(query)
      .populate('assignedStaff', 'name email')
      .populate('createdBy', 'name')
      .sort('-createdAt');

    console.log(`✅ Found ${clients.length} clients for user ${req.user.email}`);

    if (req.user.role === 'Staff') {
      console.log('📊 Staff clients found:', clients.length);
      if (clients.length > 0) {
        console.log('👥 Client details:', clients.map(c => ({
          name: c.name,
          assignedStaff: c.assignedStaff.map(s => s.email)
        })));
      }
    } else {
      console.log('👔 Boss/Manager clients:', clients.map(c => c.name));
    }

    res.json({
      status: 'success',
      results: clients.length,
      data: { clients },
    });
  } catch (error) {
    console.error('❌ Error fetching clients:', error);
    next(error);
  }
});

/**
 * @route   GET /api/clients/:id
 * @desc    Get single client
 * @access  Private
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('assignedStaff', 'name email role')
      .populate('createdBy', 'name');

    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
    }

    // Check if user has access
    if (req.user.role === 'Staff' && !client.assignedStaff.some(s => s._id.equals(req.user._id))) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this client',
      });
    }

    res.json({
      status: 'success',
      data: { client },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/clients
 * @desc    Create new client
 * @access  Private (Boss only)
 */
router.post(
  '/',
  protect,
  authorize('Boss', 'Manager'),
  [
    body('name').trim().notEmpty().withMessage('Client name is required'),
    body('website').optional().trim(),
    body('industry').optional().trim(),
    body('cms').optional().isIn(['WordPress', 'Shopify', 'Wix', 'Webflow', 'Custom', 'Other']),
    body('locations').optional().isArray(),
    body('services').optional().isArray(),
    body('competitors').optional().isArray(),
    body('primaryKeywords').optional().isArray(),
    body('secondaryKeywords').optional().isArray(),
    body('seedKeywords').optional().isArray(),
    body('integrations').optional().isObject(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { 
        name, 
        website, 
        industry, 
        cms, 
        assignedStaff, 
        contactInfo, 
        locations,
        services,
        competitors,
        primaryKeywords,
        secondaryKeywords,
        seedKeywords,
        integrations
      } = req.body;

      // Extract domain from website URL or use website as domain
      let domain = website || '';
      if (domain) {
        domain = domain
          .toLowerCase()
          .replace(/^https?:\/\//, '') // Remove http:// or https://
          .replace(/^www\./, '')        // Remove www.
          .replace(/\/$/, '')           // Remove trailing slash
          .split('/')[0];              // Take only the domain part
      }

      // If no domain, generate one from the client name
      if (!domain || domain.trim() === '') {
        domain = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
          .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
          + '-client';
      }

      console.log('📝 Client creation attempt:', {
        name,
        website,
        domain,
        industry,
        assignedStaff
      });

      // Check if client with this domain already exists
      if (domain) {
        const existingClient = await Client.findOne({ domain });
        if (existingClient) {
          console.log('⚠️ Client already exists with domain:', domain);
          // Return the existing client instead of error (idempotent behavior)
          const populatedClient = await Client.findById(existingClient._id)
            .populate('assignedStaff', 'name email')
            .populate('createdBy', 'name');
          
          return res.status(200).json({
            status: 'success',
            message: 'Client already exists',
            data: { client: populatedClient },
          });
        }
      }

      const client = await Client.create({
        name,
        domain,
        website,
        industry,
        cms,
        assignedStaff: assignedStaff || [],
        contactInfo,
        locations: locations || [],
        services: services || [],
        competitors: competitors || [],
        primaryKeywords: primaryKeywords || [],
        secondaryKeywords: secondaryKeywords || [],
        seedKeywords: seedKeywords || [],
        integrations: integrations || {
          googleSearchConsole: false,
          googleAnalytics: false,
          googleBusinessProfile: false,
        },
        createdBy: req.user._id,
      });

      console.log('✅ Client created successfully:', {
        clientId: client._id,
        clientName: client.name,
        domain: client.domain,
        assignedStaff: client.assignedStaff,
        locations: client.locations?.length || 0,
        services: client.services?.length || 0
      });

      // Generate initial site structure with AI
      if (industry) {
        try {
          const structure = await aiService.generateSiteStructure(industry, domain);
          // Store structure in notes or create tasks for implementation
          client.notes = `AI-Generated Structure:\n${structure.structure}`;
          await client.save();
        } catch (aiError) {
          // Continue even if AI fails
          console.error('AI structure generation failed:', aiError);
        }
      }

      // Update assigned staff users
      if (assignedStaff && assignedStaff.length > 0) {
        await User.updateMany(
          { _id: { $in: assignedStaff } },
          { $addToSet: { assignedClients: client._id } }
        );
      }

      const populatedClient = await Client.findById(client._id)
        .populate('assignedStaff', 'name email')
        .populate('createdBy', 'name');

      console.log('📤 Sending response with populated client');

      res.status(201).json({
        status: 'success',
        data: { client: populatedClient },
      });
    } catch (error) {
      console.error('❌ Error creating client:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: messages
        });
      }
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({
          status: 'error',
          message: 'A client with this domain already exists'
        });
      }
      
      next(error);
    }
  }
);

/**
 * @route   PUT /api/clients/:id
 * @desc    Update client
 * @access  Private (Boss only)
 */
router.put(
  '/:id',
  protect,
  authorize('Boss'),
  async (req, res, next) => {
    try {
      const { assignedStaff, website, ...updateFields } = req.body;

      const client = await Client.findById(req.params.id);
      if (!client) {
        return res.status(404).json({
          status: 'error',
          message: 'Client not found',
        });
      }

      // Clean domain if website is provided
      if (website) {
        updateFields.website = website;
        updateFields.domain = website
          .toLowerCase()
          .replace(/^https?:\/\//, '') // Remove http:// or https://
          .replace(/^www\./, '')        // Remove www.
          .replace(/\/$/, '')           // Remove trailing slash
          .split('/')[0];              // Take only the domain part
      }

      // Update client
      Object.assign(client, updateFields);
      
      //Save the client first with the basic updates
      let updatedClient;
      
      // Handle staff assignment changes
      if (assignedStaff !== undefined) {
        console.log('🔄 Updating assignedStaff:', {
          clientId: client._id,
          clientName: client.name,
          oldStaff: client.assignedStaff,
          newStaff: assignedStaff
        });
        
        const oldStaff = client.assignedStaff;
        
        // Remove client from old staff
        await User.updateMany(
          { _id: { $in: oldStaff } },
          { $pull: { assignedClients: client._id } }
        );
        
        // Add client to new staff
        await User.updateMany(
          { _id: { $in: assignedStaff } },
          { $addToSet: { assignedClients: client._id } }
        );
        
        // Update assignedStaff using findByIdAndUpdate to avoid version conflicts
        updatedClient = await Client.findByIdAndUpdate(
          client._id,
          { ...updateFields, assignedStaff },
          { new: true, runValidators: true }
        )
        .populate('assignedStaff', 'name email')
        .populate('createdBy', 'name');
      } else {
        // Just save the basic updates
        await client.save();
        updatedClient = await Client.findById(client._id)
          .populate('assignedStaff', 'name email')
          .populate('createdBy', 'name');
      }

      res.json({
        status: 'success',
        data: { client: updatedClient },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete (deactivate) client - Use ?permanent=true for hard delete
 * @access  Private (Boss/Manager only)
 */
router.delete('/:id', protect, authorize('Boss', 'Manager'), async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
    }

    console.log('🗑️ Delete request for client:', {
      clientId: req.params.id,
      clientName: client.name,
      permanent: req.query.permanent,
      userId: req.user._id,
      userEmail: req.user.email
    });

    // Check if permanent delete is requested
    if (req.query.permanent === 'true') {
      // Hard delete - completely remove from database
      await Client.findByIdAndDelete(req.params.id);
      
      console.log('✅ Client permanently deleted from database');
      
      // Remove from assigned staff
      await User.updateMany(
        { assignedClients: client._id },
        { $pull: { assignedClients: client._id } }
      );
      
      res.json({
        status: 'success',
        message: 'Client permanently deleted successfully',
      });
    } else {
      // Soft delete - just deactivate
      client.isActive = false;
      await client.save();

      console.log('✅ Client soft deleted (deactivated)');

      // Remove from assigned staff
      await User.updateMany(
        { assignedClients: client._id },
        { $pull: { assignedClients: client._id } }
      );

      res.json({
        status: 'success',
        message: 'Client deactivated successfully',
      });
    }
  } catch (error) {
    console.error('❌ Error deleting client:', error);
    next(error);
  }
});

/**
 * @route   GET /api/clients/:id/health
 * @desc    Get client SEO health summary
 * @access  Private
 */
router.get('/:id/health', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
    }

    res.json({
      status: 'success',
      data: {
        seoHealth: client.seoHealth,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
