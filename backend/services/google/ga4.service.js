const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const path = require('path');

/**
 * GA4 Service
 * Fetches analytics data from Google Analytics 4 properties
 */

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
        { name: 'engagedSessions' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' },
      ],
    });

    return {
      success: true,
      data: response,
      metrics: response.rows?.[0]?.metricValues || [],
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
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'bounceRate' },
        { name: 'conversions' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    });

    return {
      success: true,
      data: response.rows || [],
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
    const [response] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [
        { name: 'country' },
        { name: 'deviceCategory' },
        { name: 'unifiedScreenName' }
      ],
      metrics: [
        { name: 'activeUsers' }
      ],
      limit: 10
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('GA4 getRealtimeData error:', error.message);
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
};
