const express = require('express');
const router = express.Router();
const Client = require('../models/Client.model');
const IntegrationToken = require('../models/IntegrationToken.model');
const { protect, authorize } = require('../middleware/auth');
const { getOverview, getLandingPages, getTrafficSources } = require('../services/google/ga4.service');
const { getTopQueries, getTopPages, getQueryPagePerformance } = require('../services/google/gsc.service');
const { 
  getAuthUrl, 
  getTokensFromCode, 
  listAccounts, 
  listLocations, 
  getLocationInsights,
  getSearchKeywords 
} = require('../services/google/gbp.service');

// ==================== GA4 ROUTES ====================

/**
 * @route   GET /api/integrations/clients/:id/ga4/overview
 * @desc    Get GA4 overview metrics for a client
 * @access  Private
 */
router.get('/clients/:id/ga4/overview', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
    }

    if (!client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured for this client',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const data = await getOverview(client.integrations.ga4PropertyId, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/landing-pages
 * @desc    Get GA4 landing pages for a client
 * @access  Private
 */
router.get('/clients/:id/ga4/landing-pages', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today', limit = 50 } = req.query;
    const data = await getLandingPages(client.integrations.ga4PropertyId, startDate, endDate, parseInt(limit));

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/traffic-sources
 * @desc    Get GA4 traffic sources for a client
 * @access  Private
 */
router.get('/clients/:id/ga4/traffic-sources', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const data = await getTrafficSources(client.integrations.ga4PropertyId, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/realtime
 * @desc    Get GA4 real-time active users data
 * @access  Private
 */
router.get('/clients/:id/ga4/realtime', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { getRealtimeData } = require('../services/google/ga4.service');
    const data = await getRealtimeData(client.integrations.ga4PropertyId);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/demographics
 * @desc    Get GA4 user demographics data
 * @access  Private
 */
router.get('/clients/:id/ga4/demographics', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const { getUserDemographics } = require('../services/google/ga4.service');
    const data = await getUserDemographics(client.integrations.ga4PropertyId, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/acquisition
 * @desc    Get GA4 acquisition channels data
 * @access  Private
 */
router.get('/clients/:id/ga4/acquisition', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const { getAcquisitionChannels } = require('../services/google/ga4.service');
    const data = await getAcquisitionChannels(client.integrations.ga4PropertyId, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/conversions
 * @desc    Get GA4 conversion events data
 * @access  Private
 */
router.get('/clients/:id/ga4/conversions', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const { getConversionEvents } = require('../services/google/ga4.service');
    const data = await getConversionEvents(client.integrations.ga4PropertyId, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/timeseries
 * @desc    Get GA4 time series data for trends
 * @access  Private
 */
router.get('/clients/:id/ga4/timeseries', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today', granularity = 'date' } = req.query;
    const { getTimeSeriesData } = require('../services/google/ga4.service');
    const data = await getTimeSeriesData(client.integrations.ga4PropertyId, startDate, endDate, granularity);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/ecommerce
 * @desc    Get GA4 ecommerce data
 * @access  Private
 */
router.get('/clients/:id/ga4/ecommerce', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const { getEcommerceData } = require('../services/google/ga4.service');
    const data = await getEcommerceData(client.integrations.ga4PropertyId, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/clients/:id/ga4/custom
 * @desc    Get GA4 custom report with flexible configuration
 * @access  Private
 */
router.post('/clients/:id/ga4/custom', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { getCustomReport } = require('../services/google/ga4.service');
    const data = await getCustomReport(client.integrations.ga4PropertyId, req.body);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/batch
 * @desc    Get multiple GA4 reports in one request
 * @access  Private
 */
router.get('/clients/:id/ga4/batch', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const { getBatchReports } = require('../services/google/ga4.service');
    const data = await getBatchReports(client.integrations.ga4PropertyId, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== GSC ROUTES ====================

/**
 * @route   GET /api/integrations/clients/:id/gsc/queries
 * @desc    Get GSC top queries for a client
 * @access  Private
 */
router.get('/clients/:id/gsc/queries', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.gscSiteUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'GSC not configured',
      });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    const startDate = req.query.startDate || start.toISOString().slice(0, 10);
    const endDate = req.query.endDate || end.toISOString().slice(0, 10);

    const data = await getTopQueries(client.integrations.gscSiteUrl, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/gsc/pages
 * @desc    Get GSC top pages for a client
 * @access  Private
 */
router.get('/clients/:id/gsc/pages', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.gscSiteUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'GSC not configured',
      });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    const startDate = req.query.startDate || start.toISOString().slice(0, 10);
    const endDate = req.query.endDate || end.toISOString().slice(0, 10);

    const data = await getTopPages(client.integrations.gscSiteUrl, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/gsc/query-pages
 * @desc    Get GSC query-page performance for a client
 * @access  Private
 */
router.get('/clients/:id/gsc/query-pages', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.gscSiteUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'GSC not configured',
      });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    const startDate = req.query.startDate || start.toISOString().slice(0, 10);
    const endDate = req.query.endDate || end.toISOString().slice(0, 10);

    const data = await getQueryPagePerformance(client.integrations.gscSiteUrl, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== GBP ROUTES ====================

/**
 * @route   GET /api/integrations/gbp/auth-url
 * @desc    Get GBP OAuth authorization URL
 * @access  Private (Boss/Manager/Admin)
 */
router.get('/gbp/auth-url', protect, authorize('Boss', 'Manager', 'Admin'), async (req, res, next) => {
  try {
    const state = JSON.stringify({ userId: req.user._id.toString() });
    const authUrl = getAuthUrl(state);

    res.json({
      status: 'success',
      data: { authUrl },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/integrations/gbp/callback
 * @desc    Handle GBP OAuth callback and save tokens
 * @access  Private
 */
router.post('/gbp/callback', protect, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'Authorization code required',
      });
    }

    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      return res.status(400).json({
        status: 'error',
        message: 'No refresh token received. Try disconnecting and reconnecting.',
      });
    }

    // Save or update token
    await IntegrationToken.findOneAndUpdate(
      { userId: req.user._id, provider: 'google_gbp' },
      {
        userId: req.user._id,
        provider: 'google_gbp',
        refreshToken: tokens.refresh_token,
        scope: tokens.scope ? tokens.scope.split(' ') : [],
      },
      { upsert: true, new: true }
    );

    res.json({
      status: 'success',
      message: 'GBP connected successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/gbp/accounts
 * @desc    List GBP accounts for the authenticated user
 * @access  Private
 */
router.get('/gbp/accounts', protect, async (req, res, next) => {
  try {
    const token = await IntegrationToken.findOne({
      userId: req.user._id,
      provider: 'google_gbp',
    });

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'GBP not connected. Please connect your account first.',
      });
    }

    const data = await listAccounts(token.refreshToken);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/gbp/locations
 * @desc    List GBP locations for an account
 * @access  Private
 */
router.get('/gbp/locations', protect, async (req, res, next) => {
  try {
    const { accountName } = req.query;

    if (!accountName) {
      return res.status(400).json({
        status: 'error',
        message: 'Account name required',
      });
    }

    const token = await IntegrationToken.findOne({
      userId: req.user._id,
      provider: 'google_gbp',
    });

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'GBP not connected',
      });
    }

    const data = await listLocations(token.refreshToken, accountName);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/gbp/insights
 * @desc    Get GBP insights for a client
 * @access  Private
 */
router.get('/clients/:id/gbp/insights', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.gbpLocationIds?.length) {
      return res.status(400).json({
        status: 'error',
        message: 'GBP not configured for this client',
      });
    }

    const token = await IntegrationToken.findOne({
      userId: req.user._id,
      provider: 'google_gbp',
    });

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'GBP not connected for your account',
      });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    const startDate = req.query.startDate || start.toISOString().slice(0, 10);
    const endDate = req.query.endDate || end.toISOString().slice(0, 10);

    // Get insights for the first location (you can loop through all if needed)
    const locationId = client.integrations.gbpLocationIds[0];
    const data = await getLocationInsights(token.refreshToken, locationId, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/gbp/keywords
 * @desc    Get GBP search keywords for a client
 * @access  Private
 */
router.get('/clients/:id/gbp/keywords', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.gbpLocationIds?.length) {
      return res.status(400).json({
        status: 'error',
        message: 'GBP not configured',
      });
    }

    const token = await IntegrationToken.findOne({
      userId: req.user._id,
      provider: 'google_gbp',
    });

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'GBP not connected',
      });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 90); // GBP keywords are monthly, use 3 months
    
    const startDate = req.query.startDate || start.toISOString().slice(0, 10);
    const endDate = req.query.endDate || end.toISOString().slice(0, 10);

    const locationId = client.integrations.gbpLocationIds[0];
    const data = await getSearchKeywords(token.refreshToken, locationId, startDate, endDate);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
