const express = require('express');
const router = express.Router();
const Audit = require('../models/Audit.model');
const Client = require('../models/Client.model');
const { protect } = require('../middleware/auth');
const auditService = require('../services/audit.service');
const aiService = require('../services/ai.service');

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

module.exports = router;
