const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * GA4 Service
 * Fetches analytics data from Google Analytics 4 properties
 */

const ADMIN_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit',
];

// Initialize the client with service account credentials
const getGA4Client = () => {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '../../../config/google-service-account.json');
  
  try {
    return new BetaAnalyticsDataClient({ keyFilename: keyFile });
  } catch (error) {
    console.error('GA4 Client initialization error:', error.message);
    return null;
  }
};

/**
 * Get JWT client for Admin API authentication
 * @returns {JWT} Google JWT client
 */
function getJwtClient() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '../../config/google-service-account.json');
  
  try {
    // Use keyFile parameter instead of parsing JSON manually
    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ADMIN_SCOPES,
    });
    
    return auth.getClient();
  } catch (error) {
    console.error('GA4 JWT initialization error:', error.message);
    console.error('Looking for file at:', keyFile);
    return null;
  }
}

/**
 * Get GA4 overview metrics
 * @param {string} propertyId - GA4 Property ID (e.g., "123456789")
 * @param {string} startDate - Start date (YYYY-MM-DD or relative like '30daysAgo')
 * @param {string} endDate - End date (YYYY-MM-DD or 'today')
 * @returns {Promise<Object>} Analytics data
 */
async function getOverview(propertyId, startDate = '30daysAgo', endDate = 'today') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized. Check service account credentials.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'engagedSessions' },
      ],
    });

    // Parse metric values
    const metricValues = response.rows?.[0]?.metricValues || [];
    
    return {
      totalUsers: parseInt(metricValues[0]?.value || 0),
      sessions: parseInt(metricValues[1]?.value || 0),
      screenPageViews: parseInt(metricValues[2]?.value || 0),
      averageSessionDuration: parseFloat(metricValues[3]?.value || 0),
      bounceRate: parseFloat(metricValues[4]?.value || 0) * 100, // Convert to percentage
      engagedSessions: parseInt(metricValues[5]?.value || 0),
    };
  } catch (error) {
    console.error('GA4 getOverview error:', error.message);
    throw new Error(`Failed to fetch GA4 overview: ${error.message}`);
  }
}

/**
 * Get landing pages performance
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} limit - Number of results
 * @returns {Promise<Object>} Landing pages data
 */
async function getLandingPages(propertyId, startDate = '30daysAgo', endDate = 'today', limit = 50) {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pageTitle' },
        { name: 'pagePath' }
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'sessions' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit,
    });

    // Parse the response
    const pages = (response.rows || []).map(row => ({
      pageTitle: row.dimensionValues?.[0]?.value || '',
      pagePath: row.dimensionValues?.[1]?.value || '',
      path: row.dimensionValues?.[1]?.value || '',
      views: parseInt(row.metricValues?.[0]?.value || 0),
      screenPageViews: parseInt(row.metricValues?.[0]?.value || 0),
      users: parseInt(row.metricValues?.[1]?.value || 0),
      totalUsers: parseInt(row.metricValues?.[1]?.value || 0),
      sessions: parseInt(row.metricValues?.[2]?.value || 0),
    }));

    return {
      pages,
    };
  } catch (error) {
    console.error('GA4 getLandingPages error:', error.message);
    throw new Error(`Failed to fetch landing pages: ${error.message}`);
  }
}

/**
 * Get traffic sources
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Traffic sources data
 */
async function getTrafficSources(propertyId, startDate = '30daysAgo', endDate = 'today') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'engagedSessions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20,
    });

    return {
      success: true,
      data: response.rows || [],
    };
  } catch (error) {
    console.error('GA4 getTrafficSources error:', error.message);
    throw new Error(`Failed to fetch traffic sources: ${error.message}`);
  }
}

/**
 * Get page performance for specific URLs (e.g., blog posts)
 * @param {string} propertyId - GA4 Property ID
 * @param {string[]} pageUrls - Array of page URLs to filter
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Page performance data
 */
async function getPagePerformance(propertyId, pageUrls = [], startDate = '30daysAgo', endDate = 'today') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' },
      ],
      dimensionFilter: pageUrls.length > 0 ? {
        filter: {
          fieldName: 'pagePath',
          inListFilter: { values: pageUrls },
        },
      } : undefined,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 100,
    });

    return {
      success: true,
      data: response.rows || [],
    };
  } catch (error) {
    console.error('GA4 getPagePerformance error:', error.message);
    throw new Error(`Failed to fetch page performance: ${error.message}`);
  }
}

/**
 * Get real-time active users data
 * @param {string} propertyId - GA4 Property ID
 * @returns {Promise<Object>} Real-time data
 */
async function getRealtimeData(propertyId) {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    let totalActiveUsers = 0;
    let minuteData = [];
    let activePages = [];
    let activeSources = [];
    let activeEvents = [];

    // Query 1: Get total active users
    try {
      const [totalResponse] = await client.runRealtimeReport({
        property: `properties/${propertyId}`,
        metrics: [{ name: 'activeUsers' }]
      });
      totalActiveUsers = totalResponse.rows && totalResponse.rows.length > 0
        ? parseInt(totalResponse.rows[0].metricValues[0]?.value || 0)
        : 0;
    } catch (error) {
      console.error('Failed to fetch total active users:', error.message);
    }

    // Query 2: Get active users by minute
    try {
      const [minuteResponse] = await client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [{ name: 'minutesAgo' }],
        metrics: [{ name: 'activeUsers' }]
      });
      minuteData = minuteResponse.rows?.map(row => ({
        minutesAgo: parseInt(row.dimensionValues[0]?.value || 0),
        activeUsers: parseInt(row.metricValues[0]?.value || 0)
      })).sort((a, b) => a.minutesAgo - b.minutesAgo) || [];
    } catch (error) {
      console.error('Failed to fetch minute data:', error.message);
    }

    // Query 3: Get page views by page (using unifiedScreenName which combines page and screen)
    try {
      const [pageResponse] = await client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'screenPageViews' }]
      });
      activePages = (pageResponse.rows?.map(row => ({
        page: row.dimensionValues[0]?.value || '(not set)',
        activeUsers: 0, // Not available in this query
        views: parseInt(row.metricValues[0]?.value || 0)
      })) || []).sort((a, b) => b.views - a.views).slice(0, 10);
    } catch (error) {
      console.error('Failed to fetch page data with unifiedScreenName:', error.message);
    }

    // Query 4: Get active users by city (as a proxy for geographic distribution)
    try {
      const [sourceResponse] = await client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [{ name: 'city' }],
        metrics: [{ name: 'activeUsers' }]
      });
      activeSources = (sourceResponse.rows?.map(row => ({
        source: row.dimensionValues[0]?.value || '(not set)',
        activeUsers: parseInt(row.metricValues[0]?.value || 0)
      })) || []).sort((a, b) => b.activeUsers - a.activeUsers).slice(0, 10);
    } catch (error) {
      console.error('Failed to fetch city data:', error.message);
      // If city fails, just show "All Users"
      activeSources = [{
        source: 'All Users',
        activeUsers: totalActiveUsers
      }];
    }

    // Query 5: Get event counts
    try {
      const [eventResponse] = await client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }]
      });
      activeEvents = (eventResponse.rows?.map(row => ({
        event: row.dimensionValues[0]?.value || '(not set)',
        eventCount: parseInt(row.metricValues[0]?.value || 0)
      })) || []).sort((a, b) => b.eventCount - a.eventCount).slice(0, 10);
    } catch (error) {
      console.error('Failed to fetch event data:', error.message);
    }

    // Calculate time-based totals
    const last30Min = totalActiveUsers;
    const last5Min = minuteData
      .filter(d => d.minutesAgo >= 0 && d.minutesAgo < 5)
      .reduce((sum, d) => sum + d.activeUsers, 0);
    const lastMinute = minuteData.find(d => d.minutesAgo === 0)?.activeUsers || totalActiveUsers;

    return {
      activeUsers: lastMinute,
      last30Min,
      last5Min,
      lastMinute,
      minuteData,
      activePages,
      activeSources,
      activeEvents,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('GA4 getRealtimeData error:', error);
    throw new Error(`Failed to fetch realtime data: ${error.message}`);
  }
}

/**
 * Get user demographics (countries, devices, browsers)
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Demographics data
 */
async function getUserDemographics(propertyId, startDate = '30daysAgo', endDate = 'today') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'country' },
        { name: 'city' },
        { name: 'deviceCategory' },
        { name: 'operatingSystem' },
        { name: 'browser' }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' }
      ],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 100
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('GA4 getUserDemographics error:', error.message);
    throw new Error(`Failed to fetch user demographics: ${error.message}`);
  }
}

/**
 * Get acquisition channels data
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Acquisition data
 */
async function getAcquisitionChannels(propertyId, startDate = '30daysAgo', endDate = 'today') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'sessionDefaultChannelGroup' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'engagedSessions' },
        { name: 'conversions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' }
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 50
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('GA4 getAcquisitionChannels error:', error.message);
    throw new Error(`Failed to fetch acquisition channels: ${error.message}`);
  }
}

/**
 * Get conversion events data
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Conversions data
 */
async function getConversionEvents(propertyId, startDate = '30daysAgo', endDate = 'today') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'eventName' }
      ],
      metrics: [
        { name: 'eventCount' },
        { name: 'eventCountPerUser' },
        { name: 'conversions' }
      ],
      orderBys: [{ metric: { metricName: 'conversions' }, desc: true }],
      limit: 30
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('GA4 getConversionEvents error:', error.message);
    throw new Error(`Failed to fetch conversion events: ${error.message}`);
  }
}

/**
 * Get time series data for trends
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {string} granularity - 'date', 'week', or 'month'
 * @returns {Promise<Object>} Time series data
 */
async function getTimeSeriesData(propertyId, startDate = '30daysAgo', endDate = 'today', granularity = 'date') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: granularity }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'screenPageViews' },
        { name: 'conversions' },
        { name: 'bounceRate' }
      ],
      orderBys: [{ dimension: { dimensionName: granularity } }]
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('GA4 getTimeSeriesData error:', error.message);
    throw new Error(`Failed to fetch time series data: ${error.message}`);
  }
}

/**
 * Get ecommerce data
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Ecommerce data
 */
async function getEcommerceData(propertyId, startDate = '30daysAgo', endDate = 'today') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'itemName' },
        { name: 'itemCategory' }
      ],
      metrics: [
        { name: 'itemsViewed' },
        { name: 'itemsAddedToCart' },
        { name: 'itemsPurchased' },
        { name: 'itemRevenue' },
        { name: 'purchaseToViewRate' }
      ],
      orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }],
      limit: 50
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('GA4 getEcommerceData error:', error.message);
    throw new Error(`Failed to fetch ecommerce data: ${error.message}`);
  }
}

/**
 * Get custom report with flexible configuration
 * @param {string} propertyId - GA4 Property ID
 * @param {Object} config - Report configuration
 * @returns {Promise<Object>} Custom report data
 */
async function getCustomReport(propertyId, config) {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      ...config
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('GA4 getCustomReport error:', error.message);
    throw new Error(`Failed to fetch custom report: ${error.message}`);
  }
}

/**
 * Get batch reports (multiple reports in one request)
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Batch report data
 */
async function getBatchReports(propertyId, startDate = '30daysAgo', endDate = 'today') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized.');
  }

  try {
    const [response] = await client.batchRunReports({
      property: `properties/${propertyId}`,
      requests: [
        {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'totalUsers' },
            { name: 'sessions' },
            { name: 'engagedSessions' },
            { name: 'conversions' }
          ]
        },
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
          limit: 10
        },
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
          limit: 10
        }
      ]
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('GA4 getBatchReports error:', error.message);
    throw new Error(`Failed to fetch batch reports: ${error.message}`);
  }
}

/**
 * List all GA4 properties accessible by the service account
 * @returns {Promise<Array>} List of GA4 properties
 */
async function listProperties() {
  try {
    const authClient = await getJwtClient();
    if (!authClient) {
      throw new Error('GA4 authentication failed - check service account credentials');
    }

    const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth: authClient });
    
    // First, list all accounts
    const accountsResponse = await analyticsadmin.accounts.list();
    const accounts = accountsResponse.data.accounts || [];
    
    const allProperties = [];
    
    // For each account, list properties
    for (const account of accounts) {
      try {
        const propertiesResponse = await analyticsadmin.properties.list({
          filter: `parent:${account.name}`,
        });
        
        const properties = propertiesResponse.data.properties || [];
        allProperties.push(...properties.map(prop => ({
          propertyId: prop.name.split('/')[1], // Extract numeric ID from "properties/123456789"
          displayName: prop.displayName,
          websiteUrl: prop.websiteUrl || '',
          account: account.displayName,
          createTime: prop.createTime,
        })));
      } catch (error) {
        console.error(`Error listing properties for account ${account.name}:`, error.message);
      }
    }
    
    return allProperties;
  } catch (error) {
    console.error('GA4 listProperties error:', error.message);
    
    // If no properties are found or service account has no access, return empty array
    if (error.message.includes('authentication') || error.code === 401 || error.code === 403) {
      console.warn('Service account has no GA4 properties access. Add the service account to GA4 properties.');
      return [];
    }
    
    throw new Error(`Failed to list GA4 properties: ${error.message}`);
  }
}

/**
 * Get device breakdown data
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} Device breakdown with users, sessions, bounce rate
 */
async function getDeviceData(propertyId, startDate = '30daysAgo', endDate = 'today') {
  const client = getGA4Client();
  if (!client) {
    throw new Error('GA4 client not initialized');
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'bounceRate' },
      ],
    });

    return response.rows?.map(row => ({
      device: row.dimensionValues[0]?.value || 'Unknown',
      users: parseInt(row.metricValues[0]?.value || 0),
      sessions: parseInt(row.metricValues[1]?.value || 0),
      bounceRate: parseFloat(row.metricValues[2]?.value || 0) * 100,
    })) || [];
  } catch (error) {
    console.error('GA4 getDeviceData error:', error.message);
    throw new Error(`Failed to fetch device data: ${error.message}`);
  }
}

module.exports = {
  getOverview,
  getLandingPages,
  getTrafficSources,
  getPagePerformance,
  getRealtimeData,
  getUserDemographics,
  getAcquisitionChannels,
  getConversionEvents,
  getTimeSeriesData,
  getEcommerceData,
  getCustomReport,
  getBatchReports,
  listProperties,
  getDeviceData,
};
