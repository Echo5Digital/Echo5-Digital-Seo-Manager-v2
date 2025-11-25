const express = require('express');
const router = express.Router();
const Audit = require('../models/Audit.model');
const Client = require('../models/Client.model');
const Notification = require('../models/Notification.model');
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

    // Delete old audits for this client (keep only the latest)
    try {
      const oldAudits = await Audit.find({ clientId: client._id })
        .sort('-createdAt')
        .skip(1); // Keep only 1 most recent
      
      if (oldAudits.length > 0) {
        const oldAuditIds = oldAudits.map(a => a._id);
        await Audit.deleteMany({ _id: { $in: oldAuditIds } });
        console.log(`🗑️ Cleaned up ${oldAudits.length} old audits for client: ${client.name}`);
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup old audits:', cleanupError.message);
    }

    // Create audit record
    const audit = await Audit.create({
      clientId: client._id,
      auditType: 'Full Site',
      status: 'In Progress',
      triggeredBy: req.user._id,
    });

    // Start audit (async) - Pass Client ID to enable WordPress plugin integration
    auditService.performFullAudit(clientId)
      .then(async (results) => {
        const summary = auditService.calculateAuditScore(results);
        console.log('📡 Data Source Used:', results.dataSource || 'scraping');
        const aiAnalysis = await aiService.analyzeAuditResults(summary, client.website || client.domain);

        // Map audit results explicitly into the schema shape to avoid casting issues
        const cleanedResults = {
          // Core discovery / analysis
          discoveredPages: Array.isArray(results.discoveredPages) ? results.discoveredPages : [],
          pageAnalysis: Array.isArray(results.pageAnalysis) ? results.pageAnalysis : [],
          pages: Array.isArray(results.pages) ? results.pages : [],

          // Aggregated data
          metaAnalysis: Array.isArray(results.metaAnalysis) ? results.metaAnalysis : [],
          headingStructure: Array.isArray(results.headingStructure) ? results.headingStructure : [],
          imageAnalysis: Array.isArray(results.imageAnalysis) ? results.imageAnalysis : [],
          linkAnalysis: Array.isArray(results.linkAnalysis) ? results.linkAnalysis : [],
          contentAnalysis: Array.isArray(results.contentAnalysis) ? results.contentAnalysis : [],

          // Original issue buckets (backwards compatible section in schema)
          brokenLinks: Array.isArray(results.brokenLinks) ? results.brokenLinks : [],
          missingAltTags: Array.isArray(results.missingAltTags) ? results.missingAltTags : [],
          metaIssues: Array.isArray(results.metaIssues) ? results.metaIssues : [],
          noindexPages: Array.isArray(results.noindexPages) ? results.noindexPages : [],
          pageSpeed: Array.isArray(results.pageSpeed) ? results.pageSpeed : [],

          // Critical field causing validation errors – only keep if it's a real array of objects
          schemaIssues: Array.isArray(results.schemaIssues)
            ? results.schemaIssues.filter((i) =>
                i &&
                typeof i === 'object' &&
                typeof i.url === 'string' &&
                typeof i.issue === 'string'
              )
            : [],

          internalLinkingIssues: Array.isArray(results.internalLinkingIssues) ? results.internalLinkingIssues : [],
          sitemapIssues: Array.isArray(results.sitemapIssues) ? results.sitemapIssues : [],
          robotsTxtIssues: Array.isArray(results.robotsTxtIssues) ? results.robotsTxtIssues : [],
          sslIssues: Array.isArray(results.sslIssues) ? results.sslIssues : [],
          mobileIssues: Array.isArray(results.mobileIssues) ? results.mobileIssues : [],

          // Core Web Vitals placeholder
          coreWebVitals: Array.isArray(results.coreWebVitals) ? results.coreWebVitals : [],

          // Keep dataSource inside results for convenience as well
          dataSource: results.dataSource || 'scraping',
        };

        audit.results = cleanedResults;
        audit.summary = summary;
        audit.aiAnalysis = aiAnalysis;
        audit.status = 'Completed';
        audit.completedAt = new Date();
        audit.dataSource = cleanedResults.dataSource;
        
        try {
          await audit.save();
          console.log('✅ Audit saved successfully');
          console.log('📡 Data Source:', audit.dataSource);
          console.log('📊 Summary:', summary);
        } catch (saveError) {
          console.error('❌ Error saving audit:', saveError.message);
          console.error('❌ Validation errors:', saveError.errors);
          throw saveError;
        }

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

        // Persist pages into Pages collection with latest snapshot
        try {
          await auditService.persistPages(audit, client._id)
        } catch (e) {
          console.warn('Failed to persist pages from audit:', e.message)
        }

        // Create notification for user who triggered the audit
        await Notification.create({
          userId: audit.triggeredBy,
          type: 'Audit Complete',
          title: 'Audit Completed',
          message: `Site audit for ${client.name} has been completed with a score of ${summary.overallScore}/100`,
          priority: summary.overallScore < 50 ? 'High' : summary.overallScore < 70 ? 'Medium' : 'Low',
          relatedModel: 'Audit',
          relatedId: audit._id,
          actionUrl: '/audits',
        });
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
    console.log('📋 GET /api/audits - User:', req.user.email, 'Role:', req.user.role);
    
    const { clientId } = req.query;
    let filter = clientId ? { clientId } : {};
    
    // If user is Staff, only show audits for assigned clients
    if (req.user.role === 'Staff') {
      const Client = require('../models/Client.model');
      console.log('🔍 Staff user, fetching assigned clients...');
      
      const assignedClients = await Client.find({ assignedStaff: req.user._id, isActive: true }).select('_id');
      const clientIds = assignedClients.map(c => c._id);
      
      console.log('📊 Staff has access to', clientIds.length, 'clients');
      
      if (clientId) {
        // Check if the requested client is assigned to this staff
        if (!clientIds.some(id => id.toString() === clientId)) {
          return res.status(403).json({
            status: 'error',
            message: 'Not authorized to access this client\'s audits'
          });
        }
      } else {
        // Only show audits for assigned clients
        filter.clientId = { $in: clientIds };
      }
    }
    
    console.log('🔎 Querying audits with filter:', JSON.stringify(filter));
    
    // Exclude heavy fields: results and logs to improve performance
    const audits = await Audit.find(filter)
      .select('-results -logs')
      .populate('clientId', 'name domain')
      .sort('-createdAt')
      .lean();

    console.log('✅ Found', audits.length, 'audits');

    res.json({
      status: 'success',
      results: audits.length,
      data: { audits },
    });
  } catch (error) {
    console.error('❌ Error fetching audits:', error);
    next(error);
  }
});

// GET /api/audits/:id - Get single audit by ID
router.get('/:id', protect, async (req, res, next) => {
  try {
    const audit = await Audit.findById(req.params.id)
      .populate('clientId', 'name domain');

    if (!audit) {
      return res.status(404).json({
        status: 'error',
        message: 'Audit not found',
      });
    }

    // If user is Staff, check if they have access to this client
    if (req.user.role === 'Staff') {
      const Client = require('../models/Client.model');
      const client = await Client.findById(audit.clientId._id);
      if (!client || !client.assignedStaff.some(staffId => staffId.toString() === req.user._id.toString())) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to access this audit'
        });
      }
    }

    console.log('📤 Returning audit:', {
      id: audit._id,
      status: audit.status,
      hasSummary: !!audit.summary,
      summary: audit.summary
    });

    res.json({
      status: 'success',
      data: { audit },
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

    // Delete old audits for this client (keep only the latest)
    try {
      const oldAudits = await Audit.find({ clientId: client._id })
        .sort('-createdAt')
        .skip(1); // Keep only 1 most recent
      
      if (oldAudits.length > 0) {
        const oldAuditIds = oldAudits.map(a => a._id);
        await Audit.deleteMany({ _id: { $in: oldAuditIds } });
        console.log(`🗑️ Cleaned up ${oldAudits.length} old audits for client: ${client.name}`);
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup old audits:', cleanupError.message);
    }

    // Create audit record
    const audit = await Audit.create({
      clientId: client._id,
      auditType: 'Full Site',
      status: 'In Progress',
      triggeredBy: req.user._id,
    });

    // Start audit (async) - Pass Client ID to enable WordPress plugin integration
    auditService.performFullAudit(client._id.toString())
      .then(async (results) => {
        const summary = auditService.calculateAuditScore(results);
        console.log('📡 Data Source Used:', results.dataSource || 'scraping');
        const aiAnalysis = await aiService.analyzeAuditResults(summary, client.website || client.domain);

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

        // Persist pages into Pages collection with latest snapshot
        try {
          await auditService.persistPages(audit, client._id)
        } catch (e) {
          console.warn('Failed to persist pages from audit:', e.message)
        }
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

    // If user is Staff, check if they have access to this client
    if (req.user.role === 'Staff') {
      const Client = require('../models/Client.model');
      const client = await Client.findById(audit.clientId._id);
      if (!client || !client.assignedStaff.some(staffId => staffId.toString() === req.user._id.toString())) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to access this audit'
        });
      }
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
    console.log('🗑️ DELETE /api/audits/:auditId - User:', req.user.email, 'Audit ID:', req.params.auditId);
    
    const audit = await Audit.findById(req.params.auditId);

    if (!audit) {
      console.log('❌ Audit not found:', req.params.auditId);
      return res.status(404).json({
        status: 'error',
        message: 'Audit not found',
      });
    }

    console.log('📋 Found audit:', audit._id, 'for client:', audit.clientId);

    // Check if user has permission to delete this audit
    // Staff can only delete audits for their assigned clients
    if (req.user.role === 'Staff') {
      const Client = require('../models/Client.model');
      const client = await Client.findById(audit.clientId);
      
      if (!client || !client.assignedStaff.includes(req.user._id)) {
        console.log('❌ Staff user not authorized to delete this audit');
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to delete this audit'
        });
      }
    }

    await Audit.findByIdAndDelete(req.params.auditId);
    console.log('✅ Audit deleted successfully:', req.params.auditId);

    res.json({
      status: 'success',
      message: 'Audit deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting audit:', error);
    next(error);
  }
});

module.exports = router;
