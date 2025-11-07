const { google } = require('googleapis');

/**
 * Google Business Profile Service
 * Fetches business performance and review data
 */

const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
];

// In-memory cache for GBP data (prevents quota exhaustion)
const cache = {
  accounts: new Map(),
  locations: new Map(),
};

// Cache TTL (Time To Live) in milliseconds
const CACHE_TTL = {
  accounts: 30 * 60 * 1000, // 30 minutes
  locations: 15 * 60 * 1000, // 15 minutes
};

// Rate limiting - track last request time per user
const rateLimiter = new Map();
const MIN_REQUEST_INTERVAL = 30000; // 30 seconds between requests (safe for 2/minute quota)

// Global rate limiter - prevent ANY GBP API call within 30 seconds
let lastGlobalRequest = 0;
const GLOBAL_MIN_INTERVAL = 30000; // 30 seconds globally

/**
 * Check if request is rate limited
 * @param {string} key - User identifier
 * @returns {boolean} True if should wait
 */
function isRateLimited(key) {
  const now = Date.now();
  
  // Check global rate limit first
  if (now - lastGlobalRequest < GLOBAL_MIN_INTERVAL) {
    const waitTime = Math.ceil((GLOBAL_MIN_INTERVAL - (now - lastGlobalRequest)) / 1000);
    console.log(`⏱ Global rate limit: Please wait ${waitTime} more seconds`);
    return true;
  }
  
  // Check user-specific rate limit
  const lastRequest = rateLimiter.get(key);
  if (lastRequest && now - lastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = Math.ceil((MIN_REQUEST_INTERVAL - (now - lastRequest)) / 1000);
    console.log(`⏱ User rate limit: Please wait ${waitTime} more seconds`);
    return true;
  }
  
  // Update both limiters
  rateLimiter.set(key, now);
  lastGlobalRequest = now;
  return false;
}

/**
 * Get cached data if available and not expired
 * @param {string} type - Cache type (accounts, locations)
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
function getCached(type, key) {
  const cacheMap = cache[type];
  const cached = cacheMap.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL[type]) {
    return cached.data;
  }
  
  // Remove expired entry
  if (cached) {
    cacheMap.delete(key);
  }
  
  return null;
}

/**
 * Set cache data
 * @param {string} type - Cache type
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
function setCache(type, key, data) {
  cache[type].set(key, {
    data,
    timestamp: Date.now(),
  });
}

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
  // Check cache first
  const cacheKey = `token_${refreshToken.substring(0, 20)}`;
  const cached = getCached('accounts', cacheKey);
  
  if (cached) {
    console.log('✓ Returning cached GBP accounts (avoiding API call)');
    return cached;
  }

  // Rate limiting check
  if (isRateLimited(cacheKey)) {
    console.log('⏱ Rate limited - returning cached data or waiting');
    const cachedData = getCached('accounts', cacheKey);
    if (cachedData) {
      console.log('✓ Returning cached accounts (rate limited)');
      return cachedData;
    }
    throw new Error('API rate limit: Please wait 30 seconds between requests. Google Business Profile API allows only 2 requests per minute.');
  }

  const auth = await getAuthorizedClient(refreshToken);
  const accountmanagement = google.mybusinessaccountmanagement({ version: 'v1', auth });
  
  try {
    console.log('📡 Fetching GBP accounts from API...');
    const { data } = await accountmanagement.accounts.list();
    const result = {
      success: true,
      accounts: data.accounts || [],
    };
    
    // Cache the result
    setCache('accounts', cacheKey, result);
    console.log('✓ GBP accounts cached successfully');
    
    return result;
  } catch (error) {
    // Handle quota exceeded error gracefully
    if (error.code === 429 || error.message.includes('Quota exceeded')) {
      console.warn('⚠️  GBP quota exceeded - quota resets every minute');
      // Cache the error state to prevent repeated attempts
      const errorResult = {
        success: false,
        accounts: [],
        quotaExceeded: true,
      };
      setCache('accounts', cacheKey, errorResult);
      throw new Error('Quota exceeded');
    }
    
    console.error('❌ GBP listAccounts error:', error.message);
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
  // Check cache first
  const cacheKey = `${accountName}_${refreshToken.substring(0, 20)}`;
  const cached = getCached('locations', cacheKey);
  
  if (cached) {
    console.log('Returning cached GBP locations');
    return cached;
  }

  const auth = await getAuthorizedClient(refreshToken);
  const businessinformation = google.mybusinessbusinessinformation({ version: 'v1', auth });
  
  try {
    const { data } = await businessinformation.accounts.locations.list({
      parent: accountName,
      readMask: 'name,title,storefrontAddress,phoneNumbers,websiteUri',
    });
    
    const result = {
      success: true,
      locations: data.locations || [],
    };
    
    // Cache the result
    setCache('locations', cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('GBP listLocations error:', error.message);
    
    // Handle quota exceeded error gracefully
    if (error.code === 429 || error.message.includes('Quota exceeded')) {
      throw new Error('Google Business Profile API quota exceeded. Please try again in a few minutes.');
    }
    
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
