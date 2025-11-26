/**
 * Intelligence Routes
 * 
 * Unified client intelligence API endpoints
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const clientIntelligenceService = require('../services/clientIntelligence.service');
const dataSyncService = require('../services/dataSync.service');
const deltaTrackingService = require('../services/deltaTracking.service');
const knowledgeGraphService = require('../services/knowledgeGraph.service');

/**
 * @route   GET /api/intelligence/overview
 * @desc    Get all clients intelligence overview (dashboard)
 * @access  Private
 */
router.get('/overview', protect, async (req, res, next) => {
  try {
    const overview = await clientIntelligenceService.getAllClientsOverview(
      req.user._id,
      req.user.role
    );

    res.json({
      status: 'success',
      data: overview
    });
  } catch (error) {
    console.error('❌ [Intelligence] Overview failed:', error);
    next(error);
  }
});

/**
 * @route   GET /api/intelligence/client/:clientId
 * @desc    Get complete intelligence profile for a client
 * @access  Private
 */
router.get('/client/:clientId', protect, async (req, res, next) => {
  try {
    const profile = await clientIntelligenceService.getClientIntelligence(
      req.params.clientId
    );

    res.json({
      status: 'success',
      data: profile
    });
  } catch (error) {
    console.error('❌ [Intelligence] Client profile failed:', error);
    next(error);
  }
});

/**
 * @route   GET /api/intelligence/client/:clientId/insights
 * @desc    Generate AI insights for a client
 * @access  Private
 */
router.get('/client/:clientId/insights', protect, async (req, res, next) => {
  try {
    const insights = await clientIntelligenceService.generateAIInsights(
      req.params.clientId
    );

    res.json({
      status: 'success',
      data: insights
    });
  } catch (error) {
    console.error('❌ [Intelligence] AI insights failed:', error);
    next(error);
  }
});

/**
 * @route   GET /api/intelligence/client/:clientId/trends
 * @desc    Get trend summary (7-day and 30-day comparisons)
 * @access  Private
 */
router.get('/client/:clientId/trends', protect, async (req, res, next) => {
  try {
    const [day7, day30, trends] = await Promise.all([
      deltaTrackingService.get7DayComparison(req.params.clientId),
      deltaTrackingService.get30DayComparison(req.params.clientId),
      deltaTrackingService.getTrendSummary(req.params.clientId)
    ]);

    res.json({
      status: 'success',
      data: {
        summary: trends,
        day7,
        day30
      }
    });
  } catch (error) {
    console.error('❌ [Intelligence] Trends failed:', error);
    next(error);
  }
});

/**
 * @route   GET /api/intelligence/client/:clientId/sync-status
 * @desc    Get data sync status for a client
 * @access  Private
 */
router.get('/client/:clientId/sync-status', protect, async (req, res, next) => {
  try {
    const status = await dataSyncService.getSyncStatus(req.params.clientId);

    res.json({
      status: 'success',
      data: status
    });
  } catch (error) {
    console.error('❌ [Intelligence] Sync status failed:', error);
    next(error);
  }
});

/**
 * @route   POST /api/intelligence/client/:clientId/sync
 * @desc    Trigger manual data sync for a client
 * @access  Private (Boss/Manager only)
 */
router.post('/client/:clientId/sync', protect, authorize('Boss', 'Manager'), async (req, res, next) => {
  try {
    const { sources } = req.body; // Optional: ['ga4', 'gsc', 'gbp']
    const clientId = req.params.clientId;

    const results = {
      ga4: null,
      gsc: null,
      gbp: null
    };

    // Sync requested sources or all
    if (!sources || sources.includes('ga4')) {
      results.ga4 = await dataSyncService.syncClientGA4(clientId);
    }
    if (!sources || sources.includes('gsc')) {
      results.gsc = await dataSyncService.syncClientGSC(clientId);
    }
    if (!sources || sources.includes('gbp')) {
      results.gbp = await dataSyncService.syncClientGBP(clientId);
    }

    res.json({
      status: 'success',
      message: 'Sync completed',
      data: results
    });
  } catch (error) {
    console.error('❌ [Intelligence] Manual sync failed:', error);
    next(error);
  }
});

/**
 * @route   GET /api/intelligence/client/:clientId/metrics
 * @desc    Get metrics history for a client
 * @access  Private
 */
router.get('/client/:clientId/metrics', protect, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const metrics = await dataSyncService.getMetricsHistory(req.params.clientId, days);

    res.json({
      status: 'success',
      results: metrics.length,
      data: { metrics }
    });
  } catch (error) {
    console.error('❌ [Intelligence] Metrics history failed:', error);
    next(error);
  }
});

// ============== Knowledge Graph Routes ==============

/**
 * @route   GET /api/intelligence/client/:clientId/knowledge-graph
 * @desc    Get knowledge graph for a client
 * @access  Private
 */
router.get('/client/:clientId/knowledge-graph', protect, async (req, res, next) => {
  try {
    const graph = await knowledgeGraphService.getGraph(req.params.clientId);

    if (!graph) {
      return res.status(404).json({
        status: 'error',
        message: 'Knowledge graph not found. Build it first.'
      });
    }

    res.json({
      status: 'success',
      data: { graph }
    });
  } catch (error) {
    console.error('❌ [Intelligence] Knowledge graph fetch failed:', error);
    next(error);
  }
});

/**
 * @route   POST /api/intelligence/client/:clientId/knowledge-graph/build
 * @desc    Build or rebuild knowledge graph for a client
 * @access  Private (Boss/Manager only)
 */
router.post('/client/:clientId/knowledge-graph/build', protect, authorize('Boss', 'Manager'), async (req, res, next) => {
  try {
    const graph = await knowledgeGraphService.buildClientGraph(req.params.clientId);

    res.json({
      status: 'success',
      message: 'Knowledge graph built successfully',
      data: {
        graphId: graph._id,
        version: graph.version,
        completeness: graph.buildStatus.completeness
      }
    });
  } catch (error) {
    console.error('❌ [Intelligence] Knowledge graph build failed:', error);
    next(error);
  }
});

/**
 * @route   GET /api/intelligence/client/:clientId/knowledge-graph/visualization
 * @desc    Get knowledge graph visualization data (for D3.js)
 * @access  Private
 */
router.get('/client/:clientId/knowledge-graph/visualization', protect, async (req, res, next) => {
  try {
    const vizData = await knowledgeGraphService.getVisualizationData(req.params.clientId);

    if (!vizData) {
      return res.status(404).json({
        status: 'error',
        message: 'Knowledge graph not found'
      });
    }

    res.json({
      status: 'success',
      data: vizData
    });
  } catch (error) {
    console.error('❌ [Intelligence] Visualization data failed:', error);
    next(error);
  }
});

// ============== Admin/System Routes ==============

/**
 * @route   POST /api/intelligence/sync-all
 * @desc    Trigger sync for all clients (admin only)
 * @access  Private (Boss only)
 */
router.post('/sync-all', protect, authorize('Boss'), async (req, res, next) => {
  try {
    // Start async - don't wait
    dataSyncService.syncAllClients().catch(err => {
      console.error('❌ [Intelligence] Background sync failed:', err);
    });

    res.json({
      status: 'success',
      message: 'Full sync started in background'
    });
  } catch (error) {
    console.error('❌ [Intelligence] Sync all failed:', error);
    next(error);
  }
});

/**
 * @route   POST /api/intelligence/calculate-deltas
 * @desc    Calculate deltas for all clients (admin only)
 * @access  Private (Boss only)
 */
router.post('/calculate-deltas', protect, authorize('Boss'), async (req, res, next) => {
  try {
    const results = await deltaTrackingService.calculateAllClientDeltas();

    res.json({
      status: 'success',
      message: 'Delta calculation complete',
      data: results
    });
  } catch (error) {
    console.error('❌ [Intelligence] Delta calculation failed:', error);
    next(error);
  }
});

module.exports = router;
