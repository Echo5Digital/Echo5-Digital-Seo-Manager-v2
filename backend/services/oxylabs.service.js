/**
 * Oxylabs SERP API Service
 * 
 * Provides rank checking functionality using Oxylabs SERP API
 * Integrated with the existing rank tracking system
 */

const axios = require('axios');

class OxylabsService {
  constructor() {
    this.username = process.env.OXYLABS_USER;
    this.password = process.env.OXYLABS_PASS;
    this.baseUrl = 'https://realtime.oxylabs.io/v1/queries';
  }

  /**
   * Check if Oxylabs credentials are configured
   */
  isConfigured() {
    return !!(this.username && this.password);
  }

  /**
   * Get rank for a specific keyword and domain
   * @param {Object} params - Search parameters
   * @param {string} params.keyword - Keyword to search for
   * @param {string} params.domain - Domain to find in results
   * @param {number} params.depth - Number of results to check (10, 20, 50, 100)
   * @param {string} params.location - Location name (e.g., 'United States', 'New York')
   * @returns {Object} Result with rank position and metadata
   */
  async checkRank({ keyword, domain, depth = 100, location = 'United States' }) {
    if (!this.isConfigured()) {
      throw new Error('Oxylabs credentials not configured');
    }

    try {
      // Oxylabs uses 'start_page' and 'pages' instead of depth
      // Each page has ~10 results, so calculate pages needed
      const resultsPerPage = 10;
      const pagesNeeded = Math.ceil(depth / resultsPerPage);

      // Oxylabs SERP API payload
      const payload = {
        source: 'google_search',
        domain: 'com',
        query: keyword,
        geo_location: location,
        parse: true,
        pages: pagesNeeded, // Request multiple pages at once
        context: [
          {
            key: 'results_language',
            value: 'en'
          }
        ]
      };

      console.log('🔍 Calling Oxylabs SERP API...');
      console.log('   Keyword:', keyword);
      console.log('   Domain:', domain);
      console.log('   Pages:', pagesNeeded, `(for depth ${depth})`);
      console.log('   Location:', location);

      const response = await axios.post(this.baseUrl, payload, {
        auth: {
          username: this.username,
          password: this.password
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 90000 // 90 second timeout
      });

      // Parse Oxylabs response - handle multiple pages
      const results = response.data?.results || [];
      let allOrganicResults = [];
      
      // Collect organic results from all pages
      for (const pageResult of results) {
        const organicResults = pageResult?.content?.results?.organic || [];
        allOrganicResults = allOrganicResults.concat(organicResults);
      }
      
      console.log(`📦 Found ${allOrganicResults.length} organic results from Oxylabs (${results.length} page(s))`);

      // Search for domain in results
      const normalizedTarget = this.normalizeDomain(domain);
      let rank = null;
      let foundUrl = null;

      for (let i = 0; i < allOrganicResults.length; i++) {
        const result = allOrganicResults[i];
        const resultDomain = this.normalizeDomain(result.url || '');
        
        if (resultDomain && (resultDomain === normalizedTarget || resultDomain.includes(normalizedTarget))) {
          rank = result.pos || (i + 1); // Use position from API or index
          foundUrl = result.url;
          console.log(`🎯 Found at position #${rank}: ${foundUrl}`);
          break;
        }
      }

      return {
        rank,
        found: !!rank,
        totalResults: allOrganicResults.length,
        depth,
        url: foundUrl,
        cost: this.estimateCost(pagesNeeded), // Cost based on pages requested
        provider: 'oxylabs'
      };

    } catch (error) {
      console.error('❌ Oxylabs API Error:', error.message);
      
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw new Error(`Oxylabs API: ${error.message}`);
    }
  }

  /**
   * Normalize domain for comparison
   */
  normalizeDomain(url) {
    try {
      if (!url) return '';
      if (!url.startsWith('http')) url = 'http://' + url;
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {
      return String(url).replace(/^www\./, '').toLowerCase();
    }
  }

  /**
   * Estimate API cost based on pages requested
   * Oxylabs pricing varies, this is an approximation
   */
  estimateCost(pages) {
    // Oxylabs charges per request (per page)
    // Typical cost is around $2-3 per 1000 requests
    // Each page is one request
    return 0.002 * pages; // ~$0.002 per page/request
  }

  /**
   * Map location name to Oxylabs geo_location format
   */
  mapLocation(location) {
    const locationMap = {
      'united states': 'United States',
      'usa': 'United States',
      'us': 'United States',
      'new york': 'New York,New York,United States',
      'los angeles': 'Los Angeles,California,United States',
      'chicago': 'Chicago,Illinois,United States',
      'canada': 'Canada',
      'united kingdom': 'United Kingdom',
      'uk': 'United Kingdom',
      'london': 'London,England,United Kingdom',
      'australia': 'Australia',
      'sydney': 'Sydney,New South Wales,Australia'
    };

    const normalized = location.toLowerCase().trim();
    return locationMap[normalized] || location;
  }
}

module.exports = new OxylabsService();
