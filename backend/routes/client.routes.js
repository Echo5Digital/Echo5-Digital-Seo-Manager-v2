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

    // If user is Staff, only show assigned clients
    if (req.user.role === 'Staff') {
      query.assignedStaff = req.user._id;
    }

    const clients = await Client.find(query)
      .populate('assignedStaff', 'name email')
      .populate('createdBy', 'name')
      .sort('-createdAt');

    res.json({
      status: 'success',
      results: clients.length,
      data: { clients },
    });
  } catch (error) {
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
  authorize('Boss'),
  [
    body('name').trim().notEmpty().withMessage('Client name is required'),
    body('domain').trim().notEmpty().withMessage('Domain is required'),
    body('industry').optional().trim(),
    body('cms').optional().isIn(['WordPress', 'Shopify', 'Wix', 'Webflow', 'Custom', 'Other']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, domain, industry, cms, assignedStaff, contactInfo } = req.body;

      const client = await Client.create({
        name,
        domain: domain.toLowerCase(),
        industry,
        cms,
        assignedStaff: assignedStaff || [],
        contactInfo,
        createdBy: req.user._id,
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

      res.status(201).json({
        status: 'success',
        data: { client: populatedClient },
      });
    } catch (error) {
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
      const { assignedStaff, ...updateFields } = req.body;

      const client = await Client.findById(req.params.id);
      if (!client) {
        return res.status(404).json({
          status: 'error',
          message: 'Client not found',
        });
      }

      // Update client
      Object.assign(client, updateFields);
      
      // Handle staff assignment changes
      if (assignedStaff) {
        const oldStaff = client.assignedStaff;
        client.assignedStaff = assignedStaff;
        
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
      }

      await client.save();

      const updatedClient = await Client.findById(client._id)
        .populate('assignedStaff', 'name email')
        .populate('createdBy', 'name');

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
 * @desc    Delete (deactivate) client
 * @access  Private (Boss only)
 */
router.delete('/:id', protect, authorize('Boss'), async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
    }

    client.isActive = false;
    await client.save();

    // Remove from assigned staff
    await User.updateMany(
      { assignedClients: client._id },
      { $pull: { assignedClients: client._id } }
    );

    res.json({
      status: 'success',
      message: 'Client deactivated successfully',
    });
  } catch (error) {
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
