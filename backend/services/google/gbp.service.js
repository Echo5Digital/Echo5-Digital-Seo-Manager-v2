const { google } = require('googleapis');

/**
 * Google Business Profile Service
 * Fetches business performance and review data
 */

const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
];

/**
 * Get OAuth2 client
 * @returns {OAuth2Client} Google OAuth2 client
 */
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

/**
 * Get authorized client using refresh token
 * @param {string} refreshToken - OAuth refresh token
 * @returns {Promise<OAuth2Client>} Authorized OAuth2 client
 */
async function getAuthorizedClient(refreshToken) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  return oauth2Client;
}

/**
 * Get authorization URL for OAuth flow
 * @param {string} state - State parameter for OAuth
 * @returns {string} Authorization URL
 */
function getAuthUrl(state = '') {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code
 * @returns {Promise<Object>} Tokens object
 */
async function getTokensFromCode(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * List all business accounts
 * @param {string} refreshToken - OAuth refresh token
 * @returns {Promise<Object>} Business accounts
 */
async function listAccounts(refreshToken) {
  const auth = await getAuthorizedClient(refreshToken);
  const accountmanagement = google.mybusinessaccountmanagement({ version: 'v1', auth });
  
  try {
    const { data } = await accountmanagement.accounts.list();
    return {
      success: true,
      accounts: data.accounts || [],
    };
  } catch (error) {
    console.error('GBP listAccounts error:', error.message);
    throw new Error(`Failed to list GBP accounts: ${error.message}`);
  }
}

/**
 * List all locations for an account
 * @param {string} refreshToken - OAuth refresh token
 * @param {string} accountName - Account name (e.g., "accounts/123456789")
 * @returns {Promise<Object>} Locations
 */
async function listLocations(refreshToken, accountName) {
  const auth = await getAuthorizedClient(refreshToken);
  const businessinformation = google.mybusinessbusinessinformation({ version: 'v1', auth });
  
  try {
    const { data } = await businessinformation.accounts.locations.list({
      parent: accountName,
      readMask: 'name,title,storefrontAddress,phoneNumbers,websiteUri',
    });
    
    return {
      success: true,
      locations: data.locations || [],
    };
  } catch (error) {
    console.error('GBP listLocations error:', error.message);
    throw new Error(`Failed to list GBP locations: ${error.message}`);
  }
}

/**
 * Get location insights
 * @param {string} refreshToken - OAuth refresh token
 * @param {string} locationName - Location name (e.g., "locations/123456789")
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Location insights
 */
async function getLocationInsights(refreshToken, locationName, startDate, endDate) {
  const auth = await getAuthorizedClient(refreshToken);
  const performance = google.businessprofileperformance({ version: 'v1', auth });
  
  try {
    // Get daily metrics time series
    const metrics = [
      'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
      'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
      'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
      'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
      'BUSINESS_CONVERSATIONS',
      'BUSINESS_DIRECTION_REQUESTS',
      'CALL_CLICKS',
      'WEBSITE_CLICKS',
    ];

    const results = {};
    
    for (const metric of metrics) {
      try {
        const { data } = await performance.locations.getDailyMetricsTimeSeries({
          name: locationName,
          dailyMetric: metric,
          'dailyRange.startDate.year': parseInt(startDate.split('-')[0]),
          'dailyRange.startDate.month': parseInt(startDate.split('-')[1]),
          'dailyRange.startDate.day': parseInt(startDate.split('-')[2]),
          'dailyRange.endDate.year': parseInt(endDate.split('-')[0]),
          'dailyRange.endDate.month': parseInt(endDate.split('-')[1]),
          'dailyRange.endDate.day': parseInt(endDate.split('-')[2]),
        });
        
        results[metric] = data.timeSeries || {};
      } catch (metricError) {
        console.warn(`Failed to fetch metric ${metric}:`, metricError.message);
        results[metric] = { error: metricError.message };
      }
    }

    return {
      success: true,
      insights: results,
    };
  } catch (error) {
    console.error('GBP getLocationInsights error:', error.message);
    throw new Error(`Failed to fetch location insights: ${error.message}`);
  }
}

/**
 * Get search keywords for a location
 * @param {string} refreshToken - OAuth refresh token
 * @param {string} locationName - Location name
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Search keywords data
 */
async function getSearchKeywords(refreshToken, locationName, startDate, endDate) {
  const auth = await getAuthorizedClient(refreshToken);
  const performance = google.businessprofileperformance({ version: 'v1', auth });
  
  try {
    const { data } = await performance.locations.searchkeywords.impressions.monthly.list({
      parent: locationName,
      'monthlyRange.startMonth.year': parseInt(startDate.split('-')[0]),
      'monthlyRange.startMonth.month': parseInt(startDate.split('-')[1]),
      'monthlyRange.endMonth.year': parseInt(endDate.split('-')[0]),
      'monthlyRange.endMonth.month': parseInt(endDate.split('-')[1]),
    });

    return {
      success: true,
      keywords: data.searchKeywordsCounts || [],
    };
  } catch (error) {
    console.error('GBP getSearchKeywords error:', error.message);
    throw new Error(`Failed to fetch search keywords: ${error.message}`);
  }
}

/**
 * Get location reviews
 * @param {string} refreshToken - OAuth refresh token
 * @param {string} accountName - Account name
 * @param {string} locationName - Location name
 * @returns {Promise<Object>} Reviews data
 */
async function getLocationReviews(refreshToken, accountName, locationName) {
  const auth = await getAuthorizedClient(refreshToken);
  const businessinformation = google.mybusinessbusinessinformation({ version: 'v1', auth });
  
  try {
    const { data } = await businessinformation.accounts.locations.reviews.list({
      parent: locationName,
      pageSize: 50,
      orderBy: 'updateTime desc',
    });

    return {
      success: true,
      reviews: data.reviews || [],
      averageRating: data.averageRating || 0,
      totalReviewCount: data.totalReviewCount || 0,
    };
  } catch (error) {
    console.error('GBP getLocationReviews error:', error.message);
    throw new Error(`Failed to fetch location reviews: ${error.message}`);
  }
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  listAccounts,
  listLocations,
  getLocationInsights,
  getSearchKeywords,
  getLocationReviews,
};
