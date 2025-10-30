const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

/**
 * Lightweight browser-based fetcher for bypassing bot protection
 * Uses puppeteer-core (smaller) with chromium from Lambda layers
 */

let browser = null;

async function getBrowser() {
  if (browser) return browser;
  
  try {
    // For production (Render/Railway), use chromium-min
    if (process.env.NODE_ENV === 'production') {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // For local development, use system Chrome
      const executablePath = process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/google-chrome';
      
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }
    
    console.log('✅ Browser launched successfully');
    return browser;
  } catch (error) {
    console.error('❌ Failed to launch browser:', error.message);
    throw error;
  }
}

/**
 * Fetch webpage using headless browser (bypasses most bot protection)
 * @param {string} url - URL to fetch
 * @param {object} options - Options
 * @returns {Promise<string>} - HTML content
 */
async function fetchWithBrowser(url, options = {}) {
  const {
    timeout = 30000,
    waitUntil = 'networkidle2'
  } = options;
  
  let page = null;
  
  try {
    console.log('🌐 Fetching with browser:', url);
    
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();
    
    // Set realistic viewport
    await page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Navigate to page
    await page.goto(url, { 
      waitUntil,
      timeout 
    });
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);
    
    // Get HTML content
    const html = await page.content();
    
    console.log('✅ Browser fetch successful, HTML size:', html.length, 'bytes');
    
    return html;
    
  } catch (error) {
    console.error('❌ Browser fetch failed:', error.message);
    throw error;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Close browser instance (call on app shutdown)
 */
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('🔒 Browser closed');
  }
}

module.exports = {
  fetchWithBrowser,
  closeBrowser
};
