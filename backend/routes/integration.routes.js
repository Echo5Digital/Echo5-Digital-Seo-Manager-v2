const express = require('express');
const router = express.Router();
const Client = require('../models/Client.model');
const IntegrationToken = require('../models/IntegrationToken.model');
const { protect, authorize } = require('../middleware/auth');
const ga4Service = require('../services/google/ga4.service');
const gscService = require('../services/google/gsc.service');
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
 * @route   GET /api/integrations/ga4/properties
 * @desc    List all GA4 properties accessible by service account
 * @access  Private
 */
router.get('/ga4/properties', protect, async (req, res, next) => {
  try {
    const properties = await ga4Service.listProperties();
    
    res.json({
      status: 'success',
      data: properties,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/gsc/sites
 * @desc    List all GSC sites accessible by service account
 * @access  Private
 */
router.get('/gsc/sites', protect, async (req, res, next) => {
  try {
    const sites = await gscService.listSites();
    
    res.json({
      status: 'success',
      data: sites,
    });
  } catch (error) {
    next(error);
  }
});

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
    
    // Fetch overview metrics and top pages
    const [overview, landingPages] = await Promise.all([
      ga4Service.getOverview(client.integrations.ga4PropertyId, startDate, endDate),
      ga4Service.getLandingPages(client.integrations.ga4PropertyId, startDate, endDate, 10)
    ]);

    res.json({
      status: 'success',
      data: {
        ...overview,
        topPages: landingPages.pages || []
      },
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
    const result = await ga4Service.getTrafficSources(client.integrations.ga4PropertyId, startDate, endDate);

    // Parse the raw GA4 response into frontend-friendly format
    const trafficSources = (result.data || []).map(row => ({
      name: `${row.dimensionValues[0]?.value || '(direct)'} / ${row.dimensionValues[1]?.value || '(none)'}`,
      source: row.dimensionValues[0]?.value || '(direct)',
      medium: row.dimensionValues[1]?.value || '(none)',
      sessions: parseInt(row.metricValues[0]?.value || 0),
      users: parseInt(row.metricValues[1]?.value || 0),
      engagedSessions: parseInt(row.metricValues[2]?.value || 0),
      bounceRate: parseFloat(row.metricValues[3]?.value || 0),
      avgSessionDuration: parseFloat(row.metricValues[4]?.value || 0)
    }));

    res.json({
      status: 'success',
      data: trafficSources,
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

    const data = await ga4Service.getRealtimeData(client.integrations.ga4PropertyId);

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/integrations/clients/:id/ga4/devices
 * @desc    Get GA4 device breakdown data
 * @access  Private
 */
router.get('/clients/:id/ga4/devices', protect, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client || !client.integrations?.ga4PropertyId) {
      return res.status(400).json({
        status: 'error',
        message: 'GA4 not configured',
      });
    }

    const { startDate = '30daysAgo', endDate = 'today' } = req.query;
    const data = await ga4Service.getDeviceData(client.integrations.ga4PropertyId, startDate, endDate);

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
    const data = await ga4Service.getUserDemographics(client.integrations.ga4PropertyId, startDate, endDate);

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
    const data = await ga4Service.getAcquisitionChannels(client.integrations.ga4PropertyId, startDate, endDate);

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
    const data = await ga4Service.getConversionEvents(client.integrations.ga4PropertyId, startDate, endDate);

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
    const data = await ga4Service.getTimeSeriesData(client.integrations.ga4PropertyId, startDate, endDate, granularity);

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
    const data = await ga4Service.getEcommerceData(client.integrations.ga4PropertyId, startDate, endDate);

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

    const data = await ga4Service.getCustomReport(client.integrations.ga4PropertyId, req.body);

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
    const data = await ga4Service.getBatchReports(client.integrations.ga4PropertyId, startDate, endDate);

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
 * @route   GET /api/integrations/clients/:id/gsc/overview
 * @desc    Get GSC overview metrics for a client
 * @access  Private
 */
router.get('/clients/:id/gsc/overview', protect, async (req, res, next) => {
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

    const auth = await gscService.getJwtClient();
    if (!auth) {
      return res.status(500).json({
        status: 'error',
        message: 'GSC authentication failed',
      });
    }

    const { google } = require('googleapis');
    const webmasters = google.webmasters({ version: 'v3', auth });
    
    // Query without dimensions to get overall totals
    const { data } = await webmasters.searchanalytics.query({
      siteUrl: client.integrations.gscSiteUrl,
      requestBody: {
        startDate,
        endDate,
        rowLimit: 1
        // No dimensions property = overall aggregated data
      },
    });

    // Extract totals from the response
    const totals = data.rows && data.rows.length > 0 ? data.rows[0] : {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    };

    res.json({
      status: 'success',
      data: {
        totalClicks: totals.clicks || 0,
        totalImpressions: totals.impressions || 0,
        averageCTR: (totals.ctr || 0) * 100, // Convert to percentage
        averagePosition: totals.position || 0
      }
    });
  } catch (error) {
    console.error('GSC Overview error:', error);
    next(error);
  }
});

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

    const data = await gscService.getTopQueries(client.integrations.gscSiteUrl, startDate, endDate);

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

    const data = await gscService.getTopPages(client.integrations.gscSiteUrl, startDate, endDate);

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

    const data = await gscService.getQueryPagePerformance(client.integrations.gscSiteUrl, startDate, endDate);

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
 * @access  Private (Boss/Manager/Admin/Staff)
 */
router.get('/gbp/auth-url', protect, authorize('Boss', 'Manager', 'Admin', 'Staff'), async (req, res, next) => {
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
    // Handle quota exceeded error - return friendly message instead of error
    if (error.message && (error.message.includes('Quota exceeded') || error.message.includes('quota exceeded') || error.message.includes('rate limit'))) {
      return res.status(200).json({
        status: 'warning',
        message: error.message.includes('30 seconds') 
          ? 'Please wait 30 seconds between requests. Google Business Profile API has strict rate limits (2 requests per minute).'
          : 'Google Business Profile API quota temporarily exceeded. The quota resets every minute. Please wait and try again.',
        data: {
          success: true,
          accounts: [],
          quotaExceeded: true,
          rateLimited: true,
        },
      });
    }
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
