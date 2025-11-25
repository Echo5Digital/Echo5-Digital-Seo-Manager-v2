const axios = require('axios');
const { logger } = require('../utils/logger');
const Encryption = require('../utils/encryption');
const Client = require('../models/Client.model');

/**
 * WordPress Plugin Data Fetcher Service
 * 
 * Uses the Echo5 SEO Exporter plugin to fetch content directly from WordPress
 * without scraping. This eliminates timeout, blocking, and incomplete data issues.
 * 
 * Now supports per-client encrypted API key storage in MongoDB.
 */
class WordPressPluginService {
  
  /**
   * Get decrypted API key for a client
   * @param {Object} client - Client document (must include wordpressPlugin.apiKey)
   * @returns {string|null} Decrypted API key or null
   */
  async getClientApiKey(client) {
    try {
      if (!client.wordpressPlugin?.apiKey) {
        return null;
      }
      
      return Encryption.decrypt(client.wordpressPlugin.apiKey);
    } catch (error) {
      logger.error(`Failed to decrypt API key for client ${client._id}:`, error);
      return null;
    }
  }
  
  /**
   * Test connection for a specific client
   * Updates client status in database based on result
   * @param {string} clientId - Client MongoDB ID
   * @returns {Promise<Object>} Connection test result
   */
  async testClientConnection(clientId) {
    try {
      const client = await Client.findById(clientId)
        .select('+wordpressPlugin.apiKey'); // Explicitly select encrypted API key
      
      if (!client) {
        throw new Error('Client not found');
      }
      
      if (!client.wordpressPlugin?.enabled) {
        return {
          success: false,
          message: 'WordPress plugin not enabled for this client'
        };
      }
      
      const apiKey = await this.getClientApiKey(client);
      
      if (!apiKey) {
        return {
          success: false,
          message: 'No API key configured for this client'
        };
      }
      
      const siteUrl = client.wordpressPlugin.siteUrl || client.website;
      const result = await this.testConnection(siteUrl, apiKey);
      
      // Update client status in database
      const updateData = {
        'wordpressPlugin.lastHealthCheck': new Date(),
      };
      
      if (result.success) {
        updateData['wordpressPlugin.status'] = 'active';
        updateData['wordpressPlugin.pluginVersion'] = result.data?.version;
        updateData['wordpressPlugin.errorMessage'] = null;
      } else {
        updateData['wordpressPlugin.status'] = result.pluginInstalled ? 'error' : 'disconnected';
        updateData['wordpressPlugin.errorMessage'] = result.message;
      }
      
      await Client.updateOne({ _id: clientId }, updateData);
      
      logger.info(`WordPress plugin health check for ${client.domain}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      return result;
      
    } catch (error) {
      logger.error(`testClientConnection error for client ${clientId}:`, error);
      
      // Update client with error status
      await Client.updateOne(
        { _id: clientId },
        {
          'wordpressPlugin.status': 'error',
          'wordpressPlugin.errorMessage': error.message,
          'wordpressPlugin.lastHealthCheck': new Date()
        }
      );
      
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Fetch all content for a specific client
   * Uses client's encrypted API key from database
   * @param {string} clientId - Client MongoDB ID
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} All pages and posts
   */
  async fetchClientContent(clientId, options = {}) {
    try {
      const client = await Client.findById(clientId)
        .select('+wordpressPlugin.apiKey');
      
      if (!client) {
        throw new Error('Client not found');
      }
      
      if (!client.wordpressPlugin?.enabled) {
        throw new Error('WordPress plugin not enabled for this client');
      }
      
      const apiKey = await this.getClientApiKey(client);
      
      if (!apiKey) {
        throw new Error('No API key configured for this client');
      }
      
      const siteUrl = client.wordpressPlugin.siteUrl || client.website;
      const result = await this.fetchAllContent(siteUrl, apiKey, options);
      
      // Update last sync time on success
      if (result.success) {
        await Client.updateOne(
          { _id: clientId },
          {
            'wordpressPlugin.lastSync': new Date(),
            'wordpressPlugin.status': 'active'
          }
        );
      }
      
      return result;
      
    } catch (error) {
      logger.error(`fetchClientContent error for client ${clientId}:`, error);
      
      // Update client with error
      await Client.updateOne(
        { _id: clientId },
        {
          'wordpressPlugin.status': 'error',
          'wordpressPlugin.errorMessage': error.message
        }
      );
      
      throw error;
    }
  }
  
  /**
   * Test connection to WordPress plugin
   * @param {string} siteUrl - WordPress site URL
   * @param {string} apiKey - Plugin API key
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection(siteUrl, apiKey) {
    try {
      const baseUrl = this.getApiBaseUrl(siteUrl);
      console.log('🔍 Testing connection:');
      console.log('   Site URL:', siteUrl);
      console.log('   Base URL:', baseUrl);
      console.log('   API Key:', apiKey);
      console.log('   Full URL:', `${baseUrl}/health`);
      console.log('⚠️  Note: WordPress plugin must accept api_key query parameter');
      
      // Try with query parameter (WordPress CORS strips custom headers)
      const response = await axios.get(`${baseUrl}/health`, {
        params: {
          api_key: apiKey
        },
        timeout: 10000
      });
      
      return {
        success: true,
        data: response.data,
        pluginInstalled: true,
        message: 'Plugin connection successful'
      };
    } catch (error) {
      console.log('❌ Connection error:', error.response?.status, error.response?.data);
      
      if (error.response?.status === 404) {
        return {
          success: false,
          pluginInstalled: false,
          message: 'Echo5 SEO Exporter plugin not installed or not activated'
        };
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          pluginInstalled: true,
          message: 'Invalid API key'
        };
      }
      
      return {
        success: false,
        message: error.message || 'Connection failed',
        error: error.message
      };
    }
  }
  
  /**
   * Fetch all content from WordPress site
   * @param {string} siteUrl - WordPress site URL
   * @param {string} apiKey - Plugin API key
   * @param {Object} options - Fetch options
   * @returns {Promise<Array>} All pages and posts
   */
  async fetchAllContent(siteUrl, apiKey, options = {}) {
    try {
      const {
        includeContent = true,
        perPage = 100,
        maxPages = null // null = fetch all
      } = options;
      
      const baseUrl = this.getApiBaseUrl(siteUrl);
      let allContent = [];
      let currentPage = 1;
      let hasMore = true;
      
      logger.info(`🔌 Fetching content from WordPress plugin: ${siteUrl}`);
      
      while (hasMore) {
        const response = await axios.get(`${baseUrl}/content/all`, {
          params: {
            api_key: apiKey,
            page: currentPage,
            per_page: perPage,
            include_content: includeContent
          },
          timeout: 30000
        });
        
        if (response.data.success) {
          const items = response.data.data || [];
          allContent = allContent.concat(items);
          
          const pagination = response.data.pagination;
          logger.info(`✅ Fetched page ${currentPage}/${pagination.pages} (${items.length} items)`);
          
          // Check if there are more pages
          hasMore = currentPage < pagination.pages;
          
          // Check if we've reached maxPages limit
          if (maxPages && currentPage >= maxPages) {
            hasMore = false;
            logger.info(`⚠️ Reached maxPages limit (${maxPages})`);
          }
          
          currentPage++;
        } else {
          hasMore = false;
        }
      }
      
      logger.info(`🎉 Successfully fetched ${allContent.length} pages/posts via plugin`);
      
      return {
        success: true,
        items: allContent,
        totalFetched: allContent.length,
        method: 'wordpress-plugin',
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('WordPress Plugin Fetch Error:', error);
      throw new Error(`Failed to fetch from WordPress plugin: ${error.message}`);
    }
  }
  
  /**
   * Fetch single page/post by ID
   * @param {string} siteUrl - WordPress site URL
   * @param {string} apiKey - Plugin API key
   * @param {number} pageId - WordPress page/post ID
   * @returns {Promise<Object>} Page data
   */
  async fetchSinglePage(siteUrl, apiKey, pageId) {
    try {
      const baseUrl = this.getApiBaseUrl(siteUrl);
      const response = await axios.get(`${baseUrl}/pages/${pageId}`, {
        params: {
          api_key: apiKey
        },
        timeout: 15000
      });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          method: 'wordpress-plugin'
        };
      }
      
      throw new Error('Failed to fetch page');
    } catch (error) {
      logger.error(`WordPress Plugin Single Page Fetch Error (ID: ${pageId}):`, error);
      throw error;
    }
  }
  
  /**
   * Fetch site structure
   * @param {string} siteUrl - WordPress site URL
   * @param {string} apiKey - Plugin API key
   * @returns {Promise<Object>} Site structure
   */
  async fetchSiteStructure(siteUrl, apiKey) {
    try {
      const baseUrl = this.getApiBaseUrl(siteUrl);
      const response = await axios.get(`${baseUrl}/structure`, {
        params: {
          api_key: apiKey
        },
        timeout: 10000
      });
      
      return {
        success: true,
        data: response.data.data,
        method: 'wordpress-plugin'
      };
    } catch (error) {
      logger.error('WordPress Plugin Structure Fetch Error:', error);
      throw error;
    }
  }
  
  /**
   * Convert plugin data to Page model format
   * @param {Object} pluginData - Data from WordPress plugin
   * @param {string} clientId - Client MongoDB ID
   * @returns {Object} Formatted page data
   */
  convertPluginDataToPageFormat(pluginData, clientId) {
    const content = pluginData.content || {};
    const seo = pluginData.seo || {};
    const headings = pluginData.headings || {};
    const images = pluginData.images || [];
    const links = pluginData.links || {};
    
    // Extract H1 (use first H1 from headings)
    const h1 = headings.h1 && headings.h1.length > 0 ? headings.h1[0] : '';
    
    // Build page object matching Page model
    return {
      clientId: clientId,
      url: pluginData.url,
      slug: pluginData.slug,
      title: pluginData.title || '',
      metaDescription: seo.meta_description || '',
      h1: h1,
      excluded: false,
      seo: {
        canonical: seo.canonical_url || pluginData.url,
        robots: seo.robots || 'index,follow',
        focusKeyword: seo.focus_keyword || undefined,
        readabilityScore: undefined,
        seoScore: this.calculateSEOScore(pluginData),
      },
      structuredData: {
        type: 'WebPage', // Can be enhanced by parsing schema
        schema: seo.schema || {},
      },
      openGraph: {
        title: seo.og_title || pluginData.title,
        description: seo.og_description || seo.meta_description,
        image: seo.og_image || pluginData.featured_image || '',
        url: pluginData.url,
        type: 'website',
        siteName: '',
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.twitter_title || pluginData.title,
        description: seo.twitter_description || seo.meta_description,
        image: seo.twitter_image || pluginData.featured_image || '',
        site: '',
        creator: '',
      },
      content: {
        wordCount: content.word_count || 0,
        readingTime: content.reading_time || Math.max(1, Math.round((content.word_count || 0) / 200)),
        paragraphs: undefined,
        headings: {
          h1Count: headings.h1 ? headings.h1.length : 0,
          h2Count: headings.h2 ? headings.h2.length : 0,
          h3Count: headings.h3 ? headings.h3.length : 0,
        },
        links: {
          internal: links.internal_count || 0,
          external: links.external_count || 0,
          broken: 0,
        },
        sample: content.text ? content.text.substring(0, 500) : undefined,
      },
      images: images.map(img => ({
        url: img.src || '',
        alt: img.alt || '',
        width: img.width ? parseInt(img.width) : undefined,
        height: img.height ? parseInt(img.height) : undefined,
        optimized: img.has_lazy_loading || false,
      })),
      performance: {
        loadTime: undefined,
        totalResources: undefined,
        firstContentfulPaint: undefined,
        largestContentfulPaint: undefined,
        cumulativeLayoutShift: undefined,
        timeToInteractive: undefined,
      },
      technical: {
        hasSSL: pluginData.url.startsWith('https://'),
        isMobileFriendly: true, // WordPress is generally mobile-friendly
        hasViewport: true,
        hasLanguage: true,
        hasCharset: true,
        responsiveImages: images.filter(img => img.width && img.height).length > 0,
        lazyLoading: images.filter(img => img.has_lazy_loading).length > 0,
      },
      lastCrawled: new Date(),
    };
  }
  
  /**
   * Calculate basic SEO score
   * @param {Object} pluginData - Data from WordPress plugin
   * @returns {number} SEO score (0-100)
   */
  calculateSEOScore(pluginData) {
    let score = 100;
    
    const seo = pluginData.seo || {};
    const content = pluginData.content || {};
    const headings = pluginData.headings || {};
    const images = pluginData.images || [];
    
    // Title check (20 points)
    if (!pluginData.title) score -= 20;
    else if (pluginData.title.length < 30 || pluginData.title.length > 60) score -= 10;
    
    // Description check (20 points)
    if (!seo.meta_description) score -= 20;
    else if (seo.meta_description.length < 120 || seo.meta_description.length > 160) score -= 10;
    
    // H1 check (15 points)
    if (!headings.h1 || headings.h1.length === 0) score -= 15;
    else if (headings.h1.length > 1) score -= 5;
    
    // Content check (20 points)
    if (content.word_count < 300) score -= 20;
    else if (content.word_count < 500) score -= 10;
    
    // Images check (10 points)
    if (images.length > 0) {
      const imagesWithAlt = images.filter(img => img.has_alt).length;
      const altRatio = imagesWithAlt / images.length;
      score -= (1 - altRatio) * 10;
    }
    
    // Links check (10 points)
    const links = pluginData.links || {};
    if (links.internal_count === 0) score -= 10;
    else if (links.internal_count < 3) score -= 5;
    
    // Schema check (5 points)
    if (!seo.schema || Object.keys(seo.schema).length === 0) score -= 5;
    
    return Math.max(0, Math.round(score));
  }
  
  /**
   * Get API base URL for WordPress site
   * @param {string} siteUrl - WordPress site URL
   * @returns {string} API base URL
   */
  getApiBaseUrl(siteUrl) {
    // Remove trailing slash
    let cleanUrl = siteUrl.replace(/\/$/, '');
    
    // Add https:// if no protocol specified
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    return `${cleanUrl}/wp-json/echo5-seo/v1`;
  }
}

module.exports = new WordPressPluginService();
