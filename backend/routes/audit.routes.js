const express = require('express');
const router = express.Router();
const Audit = require('../models/Audit.model');
const Client = require('../models/Client.model');
const { protect } = require('../middleware/auth');
const auditService = require('../services/audit.service');
const aiService = require('../services/ai.service');

// Test endpoint for debugging page discovery
router.get('/test-discovery/:domain', protect, async (req, res) => {
  try {
    const { domain } = req.params;
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    
    console.log('🧪 Testing page discovery for:', baseUrl);
    const discoveredPages = await auditService.discoverPages(baseUrl);
    
    res.json({
      status: 'success',
      data: {
        domain: baseUrl,
        pagesFound: discoveredPages.length,
        pages: discoveredPages
      }
    });
  } catch (error) {
    console.error('Test discovery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to test page discovery',
      error: error.message
    });
  }
});

// POST /api/audits - Run audit (new API endpoint)
router.post('/', protect, async (req, res, next) => {
  try {
    const { clientId, url } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        status: 'error',
        message: 'Client ID is required',
      });
    }

    const client = await Client.findById(clientId);
    
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
    }

    // Create audit record
    const audit = await Audit.create({
      clientId: client._id,
      auditType: 'Full Site',
      status: 'In Progress',
      triggeredBy: req.user._id,
    });

    // Start audit (async)
    auditService.performFullAudit(url || client.domain)
      .then(async (results) => {
        const summary = auditService.calculateAuditScore(results);
        const aiAnalysis = await aiService.analyzeAuditResults(summary, url || client.domain);

        audit.results = results;
        audit.summary = summary;
        audit.aiAnalysis = aiAnalysis;
        audit.status = 'Completed';
        audit.completedAt = new Date();
        await audit.save();

        // Update client SEO health
        client.seoHealth = {
          score: summary.overallScore,
          lastChecked: new Date(),
          criticalIssues: summary.criticalCount,
          highIssues: summary.highCount,
          mediumIssues: summary.mediumCount,
          lowIssues: summary.lowCount,
        };
        await client.save();
      })
      .catch(async (error) => {
        audit.status = 'Failed';
        audit.error = error.message;
        await audit.save();
      });

    res.json({
      status: 'success',
      message: 'Audit started',
      data: audit,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/audits - Get all audits (optional query: clientId)
router.get('/', protect, async (req, res, next) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    
    const audits = await Audit.find(filter)
      .populate('clientId', 'name domain')
      .sort('-createdAt');

    res.json({
      status: 'success',
      results: audits.length,
      data: { audits },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/audits/run/:clientId - Run audit for client
router.post('/run/:clientId', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.clientId);
    
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
    }

    // Create audit record
    const audit = await Audit.create({
      clientId: client._id,
      auditType: 'Full Site',
      status: 'In Progress',
      triggeredBy: req.user._id,
    });

    // Start audit (async)
    auditService.performFullAudit(client.domain)
      .then(async (results) => {
        const summary = auditService.calculateAuditScore(results);
        const aiAnalysis = await aiService.analyzeAuditResults(summary, client.domain);

        audit.results = results;
        audit.summary = summary;
        audit.aiAnalysis = aiAnalysis;
        audit.status = 'Completed';
        audit.completedAt = new Date();
        await audit.save();

        // Update client SEO health
        client.seoHealth = {
          score: summary.overallScore,
          lastChecked: new Date(),
          criticalIssues: summary.criticalCount,
          highIssues: summary.highCount,
          mediumIssues: summary.mediumCount,
          lowIssues: summary.lowCount,
        };
        await client.save();
      })
      .catch(async (error) => {
        audit.status = 'Failed';
        await audit.save();
      });

    res.json({
      status: 'success',
      message: 'Audit started',
      data: { auditId: audit._id },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/audits/:clientId - Get audits for client
router.get('/:clientId', protect, async (req, res, next) => {
  try {
    const audits = await Audit.find({ clientId: req.params.clientId })
      .sort('-createdAt')
      .limit(10);

    res.json({
      status: 'success',
      results: audits.length,
      data: { audits },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/audits/details/:auditId - Get single audit by ID
router.get('/details/:auditId', protect, async (req, res, next) => {
  try {
    const audit = await Audit.findById(req.params.auditId)
      .populate('clientId', 'name domain');

    if (!audit) {
      return res.status(404).json({
        status: 'error',
        message: 'Audit not found',
      });
    }

    res.json({
      status: 'success',
      data: audit,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/audits/:auditId - Delete an audit
router.delete('/:auditId', protect, async (req, res, next) => {
  try {
    const audit = await Audit.findById(req.params.auditId);

    if (!audit) {
      return res.status(404).json({
        status: 'error',
        message: 'Audit not found',
      });
    }

    // Check if user has permission to delete this audit
    // You might want to add additional checks here based on your business logic
    await Audit.findByIdAndDelete(req.params.auditId);

    res.json({
      status: 'success',
      message: 'Audit deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
