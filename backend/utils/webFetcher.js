const axios = require('axios');

/**
 * Fetch webpage content with anti-bot protection bypass techniques
 * @param {string} url - The URL to fetch
 * @param {object} options - Additional options
 * @returns {Promise<string>} - HTML content
 */
async function fetchWebpage(url, options = {}) {
  const {
    timeout = 25000,
    retries = 2,
    useProxy = false,
    useBrowser = false // Set to true to force browser usage
  } = options;

  // More comprehensive user agent list
  const userAgents = [
    // Chrome on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    // Chrome on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    // Safari on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    // Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
  ];

  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  // Random delay between 1-4 seconds to appear more human
  const delay = Math.floor(Math.random() * 3000) + 1000;
  await new Promise(resolve => setTimeout(resolve, delay));

  // Build request config
  const config = {
    timeout,
    maxRedirects: 10,
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive',
      'DNT': '1'
    },
    validateStatus: (status) => status < 500
  };

  // Add referer if it's not the first request
  if (Math.random() > 0.5) {
    try {
      const parsedUrl = new URL(url);
      config.headers['Referer'] = `${parsedUrl.protocol}//${parsedUrl.host}/`;
    } catch {}
  }

  // Note: Proxy support removed to avoid extra dependencies
  // To use a proxy, install https-proxy-agent and uncomment below:
  // if (useProxy && process.env.HTTP_PROXY) {
  //   const { HttpsProxyAgent } = require('https-proxy-agent');
  //   config.httpsAgent = new HttpsProxyAgent(process.env.HTTP_PROXY);
  //   console.log('🔄 Using proxy:', process.env.HTTP_PROXY.replace(/\/\/.*@/, '//***:***@'));
  // }

  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`🌐 Fetching URL (attempt ${attempt + 1}/${retries}):`, url);
      
      const response = await axios.get(url, config);
      
      console.log(`✅ Response received - Status: ${response.status}, Size: ${response.data.length} bytes`);
      
      // Check for bot protection in response
      const html = response.data;
      const htmlLower = typeof html === 'string' ? html.toLowerCase() : '';
      
      const botProtectionPhrases = [
        'please wait while your request is being verified',
        'checking your browser',
        'just a moment',
        'enable javascript and cookies',
        'security check',
        'verify you are human',
        'ddos protection by cloudflare',
        'attention required',
        'ray id',  // Cloudflare
        'checking if the site connection is secure'
      ];
      
      const detectedProtection = botProtectionPhrases.find(phrase => htmlLower.includes(phrase));
      
      if (detectedProtection && htmlLower.includes('cloudflare')) {
        console.warn(`⚠️ Cloudflare protection detected on attempt ${attempt + 1}`);
        
        // If this is not the last attempt, try again with different user agent
        if (attempt < retries - 1) {
          const extraDelay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
          console.log(`⏳ Waiting ${extraDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, extraDelay));
          continue;
        }
        
        // Last attempt failed - try browser if available
        console.log('💡 Trying browser-based fetch as fallback...');
        try {
          const { fetchWithBrowser } = require('./browserFetcher');
          const browserHtml = await fetchWithBrowser(url, { timeout });
          console.log('✅ Browser fetch succeeded!');
          return browserHtml;
        } catch (browserError) {
          console.error('❌ Browser fetch also failed:', browserError.message);
          throw new Error(`Bot protection detected: ${detectedProtection}`);
        }
      }
      
      return response.data;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Fetch attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < retries - 1) {
        const retryDelay = Math.floor(Math.random() * 2000) + 2000; // 2-4 seconds
        console.log(`⏳ Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch webpage after all retries');
}

/**
 * Check if the HTML content indicates bot protection
 * @param {string} html - HTML content to check
 * @returns {object} - { detected: boolean, phrase: string|null }
 */
function detectBotProtection(html) {
  const htmlLower = typeof html === 'string' ? html.toLowerCase() : '';
  
  const botProtectionPhrases = [
    'please wait while your request is being verified',
    'checking your browser',
    'just a moment',
    'enable javascript and cookies',
    'security check',
    'verify you are human',
    'ddos protection by cloudflare',
    'attention required',
    'checking if the site connection is secure'
  ];
  
  const detectedPhrase = botProtectionPhrases.find(phrase => htmlLower.includes(phrase));
  
  return {
    detected: !!detectedPhrase,
    phrase: detectedPhrase || null,
    isCloudflare: htmlLower.includes('cloudflare')
  };
}

module.exports = {
  fetchWebpage,
  detectBotProtection
};
