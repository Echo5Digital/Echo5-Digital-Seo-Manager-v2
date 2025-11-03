/**
 * Unified Rank Checking Service
 * 
 * Handles rank checking with multiple providers (DataForSEO, Oxylabs)
 * Automatically switches based on RANK_API_PROVIDER environment variable
 */

const oxylabsService = require('./oxylabs.service');

class RankService {
  constructor() {
    this.provider = process.env.RANK_API_PROVIDER || 'dataforseo';
    console.log(`🔧 Rank API Provider: ${this.provider.toUpperCase()}`);
  }

  /**
   * Get current provider name
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Check if using Oxylabs
   */
  isOxylabs() {
    return this.provider === 'oxylabs';
  }

  /**
   * Check if using DataForSEO
   */
  isDataForSEO() {
    return this.provider === 'dataforseo';
  }

  /**
   * Check rank using Oxylabs
   * Oxylabs returns all pages in one request, so we don't need incremental checking
   */
  async checkRankWithOxylabs({ keyword, domain, location = 'United States' }) {
    const maxDepth = 100;
    
    console.log(`🔍 [Oxylabs] Checking rank for: "${keyword}"`);
    console.log(`   Domain: ${domain}`);
    console.log(`   Location: ${location}`);
    console.log(`   Checking top ${maxDepth} results...`);

    try {
      // Oxylabs fetches all pages at once, so just make one call
      const result = await oxylabsService.checkRank({
        keyword,
        domain,
        depth: maxDepth,
        location: oxylabsService.mapLocation(location)
      });

      if (result.found) {
        console.log(`  ✅ Found at #${result.rank} (cost: ${result.cost.toFixed(4)} credits)`);
      } else {
        console.log(`  ❌ Not found in top ${maxDepth} (cost: ${result.cost.toFixed(4)} credits)`);
      }

      return {
        rank: result.rank,
        found: result.found,
        url: result.url,
        totalCost: result.cost,
        provider: 'oxylabs'
      };

    } catch (error) {
      console.error(`  ❌ Oxylabs error:`, error.message);
      throw error;
    }
  }

  /**
   * Get provider-specific configuration info
   */
  getProviderInfo() {
    if (this.isOxylabs()) {
      return {
        provider: 'oxylabs',
        configured: oxylabsService.isConfigured(),
        username: process.env.OXYLABS_USER ? '***configured***' : '❌ missing',
        endpoint: 'https://realtime.oxylabs.io/v1/queries'
      };
    } else {
      return {
        provider: 'dataforseo',
        configured: !!(process.env.DATAFORSEO_USER && process.env.DATAFORSEO_PASS),
        username: process.env.DATAFORSEO_USER ? '***configured***' : '❌ missing',
        endpoint: 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced'
      };
    }
  }
}

module.exports = new RankService();
