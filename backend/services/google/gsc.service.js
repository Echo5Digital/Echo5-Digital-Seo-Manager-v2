const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * Google Search Console Service
 * Fetches search analytics data from GSC
 */

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

/**
 * Get JWT client for service account authentication
 * @returns {JWT} Google JWT client
 */
function getJwtClient() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    './config/google-service-account.json';
  
  const absolutePath = path.resolve(process.cwd(), keyFile);
  
  try {
    const keyContent = fs.readFileSync(absolutePath, 'utf8');
    const key = JSON.parse(keyContent);
    
    return new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      SCOPES
    );
  } catch (error) {
    console.error('GSC JWT initialization error:', error.message);
    console.error('Looking for file at:', absolutePath);
    return null;
  }
}

/**
 * Query search analytics data
 * @param {string} siteUrl - Site URL (e.g., "https://example.com/" or "sc-domain:example.com")
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string[]} dimensions - Dimensions to group by (query, page, country, device, date)
 * @param {number} rowLimit - Maximum rows to return
 * @returns {Promise<Object>} Search analytics data
 */
async function querySearchAnalytics(siteUrl, startDate, endDate, dimensions = ['query'], rowLimit = 25000) {
  const auth = getJwtClient();
  if (!auth) {
    throw new Error('GSC client not initialized. Check service account credentials.');
  }

  try {
    const webmasters = google.webmasters({ version: 'v3', auth });
    const { data } = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit,
        dimensionFilterGroups: [],
      },
    });

    return {
      success: true,
      data: data.rows || [],
      responseAggregationType: data.responseAggregationType,
    };
  } catch (error) {
    console.error('GSC querySearchAnalytics error:', error.message);
    throw new Error(`Failed to fetch GSC data: ${error.message}`);
  }
}

/**
 * Get top queries
 * @param {string} siteUrl - Site URL
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} limit - Number of results
 * @returns {Promise<Object>} Top queries data
 */
async function getTopQueries(siteUrl, startDate, endDate, limit = 100) {
  const auth = getJwtClient();
  if (!auth) {
    throw new Error('GSC client not initialized.');
  }

  try {
    const webmasters = google.webmasters({ version: 'v3', auth });
    const { data } = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: limit,
        aggregationType: 'auto',
      },
    });

    return {
      success: true,
      queries: data.rows || [],
    };
  } catch (error) {
    console.error('GSC getTopQueries error:', error.message);
    throw new Error(`Failed to fetch top queries: ${error.message}`);
  }
}

/**
 * Get top pages
 * @param {string} siteUrl - Site URL
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} limit - Number of results
 * @returns {Promise<Object>} Top pages data
 */
async function getTopPages(siteUrl, startDate, endDate, limit = 100) {
  const auth = getJwtClient();
  if (!auth) {
    throw new Error('GSC client not initialized.');
  }

  try {
    const webmasters = google.webmasters({ version: 'v3', auth });
    const { data } = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: limit,
        aggregationType: 'auto',
      },
    });

    return {
      success: true,
      pages: data.rows || [],
    };
  } catch (error) {
    console.error('GSC getTopPages error:', error.message);
    throw new Error(`Failed to fetch top pages: ${error.message}`);
  }
}

/**
 * Get performance by query and page
 * @param {string} siteUrl - Site URL
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} limit - Number of results
 * @returns {Promise<Object>} Query-page performance data
 */
async function getQueryPagePerformance(siteUrl, startDate, endDate, limit = 1000) {
  const auth = getJwtClient();
  if (!auth) {
    throw new Error('GSC client not initialized.');
  }

  try {
    const webmasters = google.webmasters({ version: 'v3', auth });
    const { data } = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page'],
        rowLimit: limit,
        aggregationType: 'auto',
      },
    });

    return {
      success: true,
      data: data.rows || [],
    };
  } catch (error) {
    console.error('GSC getQueryPagePerformance error:', error.message);
    throw new Error(`Failed to fetch query-page performance: ${error.message}`);
  }
}

/**
 * Get sitemaps for a site
 * @param {string} siteUrl - Site URL
 * @returns {Promise<Object>} Sitemaps data
 */
async function getSitemaps(siteUrl) {
  const auth = getJwtClient();
  if (!auth) {
    throw new Error('GSC client not initialized.');
  }

  try {
    const webmasters = google.webmasters({ version: 'v3', auth });
    const { data } = await webmasters.sitemaps.list({
      siteUrl,
    });

    return {
      success: true,
      sitemaps: data.sitemap || [],
    };
  } catch (error) {
    console.error('GSC getSitemaps error:', error.message);
    throw new Error(`Failed to fetch sitemaps: ${error.message}`);
  }
}

module.exports = {
  querySearchAnalytics,
  getTopQueries,
  getTopPages,
  getQueryPagePerformance,
  getSitemaps,
};
