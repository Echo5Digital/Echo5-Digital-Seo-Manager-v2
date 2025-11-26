const axios = require('axios');
const cheerio = require('cheerio');
const { logger } = require('../utils/logger');
const Page = require('../models/Page.model');
const Client = require('../models/Client.model');
const wordPressPluginService = require('./wordpress-plugin.service');

// Rotating user agents to avoid detection
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
];

let userAgentIndex = 0;

// Get next user agent in rotation
function getNextUserAgent() {
  const ua = USER_AGENTS[userAgentIndex];
  userAgentIndex = (userAgentIndex + 1) % USER_AGENTS.length;
  return ua;
}

// Random delay helper to add jitter (OPTIMIZED for faster audits)
async function randomDelay(min = 100, max = 300) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Site Audit Service - Crawls and analyzes websites for SEO issues
 */
class AuditService {
  /**
   * Get memory tier based on available system memory
   */
  getMemoryTier() {
    const totalMemoryMB = (require('os').totalmem() / 1024 / 1024);
    
    if (totalMemoryMB >= 3000) {
      // High memory (4GB+): Local development, large servers
      return {
        tier: 'high',
        maxDiscovery: 200,
        maxAnalysis: 100,
        batchSize: 10,     // Increased for faster processing
        batchDelay: 500,   // Reduced significantly
        enableDeepAnalysis: true
      };
    } else if (totalMemoryMB >= 1500) {
      // Medium memory (2GB): Small VPS
      return {
        tier: 'medium',
        maxDiscovery: 100,
        maxAnalysis: 50,
        batchSize: 5,      // Increased
        batchDelay: 800,   // Reduced
        enableDeepAnalysis: true
      };
    } else {
      // Low memory (512MB-1GB): Render free tier, Heroku free
      return {
        tier: 'low',
        maxDiscovery: 50,
        maxAnalysis: 25,
        batchSize: 2,      // Slight increase
        batchDelay: 1500,  // Reduced
        enableDeepAnalysis: false // Skip some heavy operations
      };
    }
  }

  /**
   * Perform full site audit
   * @param {string} domainOrClientId - Domain to audit OR Client MongoDB ID
   * @param {Object} options - Audit options
   * @returns {Promise<Object>} Audit results
   */
  async performFullAudit(domainOrClientId, options = {}) {
    try {
      let baseUrl;
      let client = null;
      let dataSource = 'scraping';
      let discoveredPages = [];
      
      // Check if input is a MongoDB ObjectID (24 char hex) or domain
      const isClientId = /^[0-9a-fA-F]{24}$/.test(domainOrClientId);
      
      if (isClientId) {
        // Fetch client from database
        client = await Client.findById(domainOrClientId);
        
        if (!client) {
          throw new Error(`Client not found: ${domainOrClientId}`);
        }
        
        baseUrl = this.formatUrl(client.website || client.domain);
        logger.info(`🎯 Auditing client: ${client.name} (${client.domain})`);
        
        // Strategy: Try WordPress plugin first if enabled
        if (client.dataSource === 'auto' || client.dataSource === 'wordpress_plugin') {
          if (client.wordpressPlugin?.enabled && client.wordpressPlugin?.status === 'active') {
            try {
              logger.info(`🔌 Attempting to fetch data via WordPress Plugin for ${client.domain}`);
              
              const pluginResult = await wordPressPluginService.fetchClientContent(client._id, {
                includeContent: true,
                perPage: 100,
                maxPages: options.maxPages || null
              });
              
              if (pluginResult.success && pluginResult.items.length > 0) {
                logger.info(`✅ WordPress Plugin fetch successful: ${pluginResult.items.length} pages`);
                
                // Convert plugin data to page format
                discoveredPages = pluginResult.items.map(item => ({
                  url: item.url,
                  title: item.title,
                  type: item.type,
                  wordCount: item.content?.word_count || 0,
                  // Store full plugin data for later analysis
                  pluginData: item
                }));
                
                dataSource = 'wordpress_plugin';
                
                logger.info(`🎉 Using ${discoveredPages.length} pages from WordPress Plugin`);
              }
            } catch (error) {
              logger.error(`❌ WordPress Plugin failed for ${client.domain}:`, error.message);
              
              // If plugin-only mode, throw error
              if (client.dataSource === 'wordpress_plugin') {
                throw new Error(`WordPress plugin fetch failed: ${error.message}`);
              }
              
              // Otherwise, log and fall back to scraping
              logger.info(`🔄 Falling back to web scraping for ${client.domain}`);
            }
          } else {
            logger.info(`⚠️ WordPress plugin not active for ${client.domain} (enabled: ${client.wordpressPlugin?.enabled}, status: ${client.wordpressPlugin?.status})`);
          }
        }
        
        // Force scraping if dataSource is set to 'scraping'
        if (client.dataSource === 'scraping') {
          logger.info(`🕷️ Scraping mode forced for ${client.domain}`);
        }
      } else {
        // Direct domain audit (legacy support)
        baseUrl = this.formatUrl(domainOrClientId);
        logger.info(`🌐 Auditing domain: ${domainOrClientId}`);
      }
      
      const memoryConfig = this.getMemoryTier();
      
      console.log(`🧠 Memory tier: ${memoryConfig.tier.toUpperCase()} (${Math.round(require('os').totalmem() / 1024 / 1024)}MB available)`);
      console.log(`📊 Config: Discovery=${memoryConfig.maxDiscovery}, Analysis=${memoryConfig.maxAnalysis}, Batch=${memoryConfig.batchSize}`);
      console.log(`📡 Data Source: ${dataSource.toUpperCase()}`);
      
      const results = {
        // Page Discovery & Analysis
        discoveredPages: [],
        pageAnalysis: [],
        
        // SEO Elements
        metaAnalysis: [],
        headingStructure: [],
        imageAnalysis: [],
        linkAnalysis: [],
        
        // Technical SEO
        brokenLinks: [],
        missingAltTags: [],
        metaIssues: [],
        noindexPages: [],
        pageSpeed: [],
        schemaIssues: [],
        internalLinkingIssues: [],
        sitemapIssues: [],
        robotsTxtIssues: [],
        sslIssues: [],
        mobileIssues: [],
        
        // Content Analysis
        contentAnalysis: [],
        duplicateContent: [],
        
        // Performance
        coreWebVitals: [],
        
        // Metadata
        memoryTier: memoryConfig.tier,
        auditConfig: memoryConfig,
        dataSource: dataSource, // Track which method was used
        clientId: client?._id,
        clientName: client?.name
      };

      // Step 1: Discover pages (or use plugin data)
      if (discoveredPages.length === 0) {
        // Traditional web scraping
        console.log('🚀 Step 1: Starting page discovery via web scraping...');
        discoveredPages = await this.discoverPages(baseUrl, memoryConfig.maxDiscovery);
        dataSource = 'scraping';
      } else {
        console.log('🚀 Step 1: Using pages from WordPress Plugin (skipping discovery)...');
      }
      
      results.discoveredPages = discoveredPages;
      console.log('📋 Step 1 completed. Pages discovered:', discoveredPages.length);
      
      // Step 2: Analyze discovered pages in batches (parallel batch processing)
      console.log('🔍 Step 2: Starting comprehensive page analysis...');
      const pagesToAnalyze = discoveredPages.slice(0, memoryConfig.maxAnalysis);
      const batchSize = 10; // 10 pages per batch
      const parallelBatches = 3; // Process 3 batches in parallel
      const pageAnalysisResults = [];
      
      // Create all batches upfront
      const allBatches = [];
      for (let i = 0; i < pagesToAnalyze.length; i += batchSize) {
        allBatches.push(pagesToAnalyze.slice(i, i + batchSize));
      }
      
      console.log(`📊 Total batches: ${allBatches.length} (${batchSize} pages per batch, ${parallelBatches} batches in parallel)`);
      
      // Process batches in groups of parallelBatches
      for (let groupIndex = 0; groupIndex < allBatches.length; groupIndex += parallelBatches) {
        const batchGroup = allBatches.slice(groupIndex, groupIndex + parallelBatches);
        const groupNumber = Math.floor(groupIndex / parallelBatches) + 1;
        const totalGroups = Math.ceil(allBatches.length / parallelBatches);
        
        console.log(`\n🚀 Processing batch group ${groupNumber}/${totalGroups} (${batchGroup.length} batches in parallel)...`);
        
        // Process all batches in this group in parallel
        const groupResults = await Promise.allSettled(
          batchGroup.map(async (batch, batchIndexInGroup) => {
            const absoluteBatchIndex = groupIndex + batchIndexInGroup;
            console.log(`   📦 Batch ${absoluteBatchIndex + 1}/${allBatches.length}: Analyzing ${batch.length} pages...`);
            
            const batchResults = await Promise.allSettled(
              batch.map(page => this.analyzePageSEO(page.url, baseUrl, memoryConfig.enableDeepAnalysis))
            );
            
            // Process batch results
            const processedResults = [];
            batchResults.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                processedResults.push(result.value);
              } else {
                const pageUrl = batch[index]?.url || 'unknown';
                console.warn(`   ⚠️ Failed to analyze: ${pageUrl} - ${result.reason?.message || 'Unknown error'}`);
                
                processedResults.push({
                  url: pageUrl,
                  error: result.reason?.message || 'Analysis failed',
                  seoAnalysis: {
                    criticalIssues: ['Failed to analyze page: ' + (result.reason?.message || 'Unknown error')],
                    opportunities: [],
                    recommendations: [],
                    seoScore: 0
                  },
                  analyzedAt: new Date()
                });
              }
            });
            
            console.log(`   ✅ Batch ${absoluteBatchIndex + 1} completed: ${processedResults.length} pages`);
            return processedResults;
          })
        );
        
        // Collect all results from this group
        groupResults.forEach(result => {
          if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            pageAnalysisResults.push(...result.value);
          }
        });
        
        console.log(`✅ Group ${groupNumber}/${totalGroups} completed. Total analyzed: ${pageAnalysisResults.length}/${pagesToAnalyze.length}`);
        
        // Force garbage collection between groups
        if (global.gc) {
          global.gc();
        }
        
        // Delay between groups to prevent IP blocking
        if (groupIndex + parallelBatches < allBatches.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased from 500ms to 2000ms
        }
      }
      
      results.pageAnalysis = pageAnalysisResults;
      console.log('📊 Step 2 completed. Page analyses:', results.pageAnalysis.length);

      // Step 3: Run additional audit checks (skip heavy ones on low memory)
      console.log('⚙️ Step 3: Running additional audit checks...');
      if (memoryConfig.enableDeepAnalysis) {
        // Full analysis for medium/high memory
        await Promise.allSettled([
          this.checkBrokenLinks(baseUrl).then(data => { results.brokenLinks = Array.isArray(data) ? data : []; return data; }).catch(() => { results.brokenLinks = []; return []; }),
          this.checkMetaTags(baseUrl).then(data => { results.metaIssues = Array.isArray(data) ? data : []; return data; }).catch(() => { results.metaIssues = []; return []; }),
          this.checkAltTags(baseUrl).then(data => { results.missingAltTags = Array.isArray(data) ? data : []; return data; }).catch(() => { results.missingAltTags = []; return []; }),
          this.checkRobotsTxt(baseUrl).then(data => { results.robotsTxtIssues = Array.isArray(data) ? data : []; return data; }).catch(() => { results.robotsTxtIssues = []; return []; }),
          this.checkSitemap(baseUrl).then(data => { results.sitemapIssues = Array.isArray(data) ? data : []; return data; }).catch(() => { results.sitemapIssues = []; return []; }),
          this.checkSSL(baseUrl).then(data => { results.sslIssues = Array.isArray(data) ? data : []; return data; }).catch(() => { results.sslIssues = []; return []; }),
          this.checkSchema(baseUrl).then(data => { results.schemaIssues = Array.isArray(data) ? data : []; return data; }).catch(() => { results.schemaIssues = []; return []; }),
        ]);
      } else {
        // Lightweight checks only for low memory
        await Promise.allSettled([
          this.checkRobotsTxt(baseUrl).then(data => { results.robotsTxtIssues = Array.isArray(data) ? data : []; return data; }).catch(() => { results.robotsTxtIssues = []; return []; }),
          this.checkSitemap(baseUrl).then(data => { results.sitemapIssues = Array.isArray(data) ? data : []; return data; }).catch(() => { results.sitemapIssues = []; return []; }),
          this.checkSSL(baseUrl).then(data => { results.sslIssues = Array.isArray(data) ? data : []; return data; }).catch(() => { results.sslIssues = []; return []; }),
        ]);
        console.log('⚠️ Skipped heavy analysis (broken links, meta tags, alt tags, schema) due to low memory');
      }
      
      // Always add Core Web Vitals placeholder
      results.coreWebVitals = [{
        type: 'Core Web Vitals',
        message: 'PageSpeed analysis requires Google PageSpeed Insights API integration',
        severity: 'Info',
        recommendation: 'Integrate with Google PageSpeed Insights API for detailed performance metrics'
      }];

      // Step 4: Aggregate data from page analyses
      console.log('📈 Step 4: Aggregating page data...');
      this.aggregatePageData(results);
      
      console.log('✅ Audit completed. Final results summary:');
      console.log('- Discovered Pages:', results.discoveredPages?.length || 0);
      console.log('- Page Analyses:', results.pageAnalysis?.length || 0);
      console.log('- Meta Analysis:', results.metaAnalysis?.length || 0);
      console.log('- Image Analysis:', results.imageAnalysis?.length || 0);

      return results;
    } catch (error) {
      logger.error('Audit Error:', error);
      throw error;
    }
  }

  /**
   * Persist audited pages into Pages collection with latest snapshot and SEO score
   * @param {Object} auditOrResults - Audit document or audit results object containing results
   * @param {String|Object} clientId - Client ObjectId
   */
  async persistPages(auditOrResults, clientId) {
    try {
      const results = auditOrResults?.results || auditOrResults
      if (!results) return
      const analyses = Array.isArray(results.pageAnalysis) ? results.pageAnalysis : []
      
      console.log(`📄 Persisting ${analyses.length} pages for client ${clientId}`);
      
      // Check if homepage is in the analyses
      const hasHomepage = analyses.some(pa => {
        try {
          const u = new URL(pa.url);
          return u.pathname === '/' || u.pathname === '';
        } catch {
          return false;
        }
      });
      console.log(`🏠 Homepage found in analyses: ${hasHomepage}`);

      const upserts = analyses.map(async (pa) => {
        try {
          const originalUrl = pa.url
          const u = new URL(originalUrl)
          
          // Skip non-HTTPS pages
          if (u.protocol !== 'https:') {
            console.log(`⏭️  Skipping non-HTTPS page: ${originalUrl}`);
            return null;
          }
          
          const path = (u.pathname || '/').replace(/\/+$/,'') || '/'
          // Use a special slug for the root path to avoid collisions with "/home" pages
          const slug = path === '/' ? '__root__' : path.replace(/^\//,'')
          
          // ============ WORDPRESS & NON-PAGE FILTERING ============
          // Skip if this is not a real content page
          const isHomepage = slug === '__root__';
          
          if (!isHomepage) {
            // 1. Skip WordPress system pages
            if (path.includes('/wp-admin') || 
                path.includes('/wp-login') || 
                path.includes('/wp-json') ||
                path.includes('/wp-content') ||
                path.includes('/wp-includes')) {
              console.log(`⏭️  Skipping WordPress system page: ${path}`);
              return null;
            }
            
            // 2. Skip all sitemaps (XML)
            if (path.includes('sitemap') && (path.endsWith('.xml') || path.includes('sitemap.xml'))) {
              console.log(`⏭️  Skipping sitemap: ${path}`);
              return null;
            }
            
            // 3. Skip WordPress templates
            if (path.includes('wpr_templates') || path.includes('/elementor/') || path.includes('/templates/')) {
              console.log(`⏭️  Skipping template: ${path}`);
              return null;
            }
            
            // 4. Skip date-based archives (e.g., /2025/10/06/, /2024/12/)
            if (/\/\d{4}\/\d{1,2}(\/\d{1,2})?\/?$/.test(path)) {
              console.log(`⏭️  Skipping date archive: ${path}`);
              return null;
            }
            
            // 5. Skip author, category, tag archives
            if (path.startsWith('/author/') || 
                path.startsWith('/tag/') || 
                path.startsWith('/category/') ||
                path.startsWith('/categories/') ||
                path.startsWith('/tags/')) {
              console.log(`⏭️  Skipping taxonomy archive: ${path}`);
              return null;
            }
            
            // 6. Skip pagination pages
            if (path.includes('/page/') && /\/page\/\d+\/?$/.test(path)) {
              console.log(`⏭️  Skipping pagination page: ${path}`);
              return null;
            }
            
            // 7. Skip feeds
            if (path.includes('/feed') || path.endsWith('/feed/') || path.endsWith('.rss') || path.endsWith('.atom')) {
              console.log(`⏭️  Skipping feed: ${path}`);
              return null;
            }
            
            // 8. Skip form pages (MetForm, Contact Form 7, WPForms, Gravity Forms)
            if (path.includes('/metform') || 
                path.includes('/cf7-') || 
                path.includes('/wpforms') ||
                path.includes('/gf-') ||
                path.includes('/gravityforms')) {
              console.log(`⏭️  Skipping form page: ${path}`);
              return null;
            }
            
            // 9. Skip search results
            if (path.includes('/search/') || u.search.includes('?s=')) {
              console.log(`⏭️  Skipping search results: ${path}`);
              return null;
            }
            
            // 10. Skip attachment/media pages
            if (path.includes('/attachment/') || path.match(/\.(jpg|jpeg|png|gif|pdf|zip|svg)$/i)) {
              console.log(`⏭️  Skipping attachment/media: ${path}`);
              return null;
            }
            
            // 11. Skip trackback/pingback/embed
            if (path.includes('/trackback') || 
                path.includes('/pingback') || 
                path.includes('/embed')) {
              console.log(`⏭️  Skipping trackback/pingback/embed: ${path}`);
              return null;
            }
            
            // 12. Skip cart, checkout, account pages (WooCommerce, EDD)
            if (path.includes('/cart') || 
                path.includes('/checkout') || 
                path.includes('/my-account') ||
                path.includes('/shop/') ||
                path.match(/\/(cart|checkout|account|login|register|orders)\/?$/)) {
              console.log(`⏭️  Skipping e-commerce utility page: ${path}`);
              return null;
            }
          }
          
          // Clean URL - remove query params and hash for homepage, keep them for other pages
          // For homepage, store clean URL without query params
          const url = slug === '__root__' 
            ? `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}/`
            : originalUrl;
          
          // Log homepage persistence
          if (slug === '__root__') {
            console.log(`🏠 Persisting homepage: ${url} (cleaned from ${originalUrl}) with slug: ${slug}`);
          }

          // Extract fields
          const meta = pa.metaData || {}
          const social = pa.socialTags || {}
          const headings = pa.headings || {}
          const images = pa.images || {}
          const content = pa.content || {}
          const perf = pa.performance || {}
          
          // Extract title from actual page <title> tag or H1, DO NOT use pathname as fallback
          // This prevents slug/path from being confused with actual SEO title
          let title = '';
          if (meta.title?.text && meta.title.text.trim()) {
            title = meta.title.text.trim();
          } else if (pa.title && pa.title.trim()) {
            title = pa.title.trim();
          } else if (Array.isArray(headings.h1Text) && headings.h1Text[0]) {
            title = headings.h1Text[0].trim();
          }
          // If no title found, leave empty - DO NOT fallback to pathname
          // This allows AI to properly identify missing title as an SEO issue
          
          const h1 = Array.isArray(headings.h1Text) ? (headings.h1Text[0] || '') : ''
          const metaDescription = meta.description?.text || ''
          
          // Calculate SEO score directly from available data (don't rely on stored seoAnalysis)
          const calculatedSeoScore = this.calculatePageSEOScore({
            hasTitle: !!title,
            titleLength: title.length,
            hasDescription: !!metaDescription,
            descriptionLength: metaDescription.length,
            hasH1: headings.h1Count === 1 || (Array.isArray(headings.h1Text) && headings.h1Text.length === 1),
            wordCount: content.wordCount || 0,
            imagesWithAlt: images.withAlt || 0,
            totalImages: images.total || 0,
            internalLinks: pa.links?.internal?.count || 0,
            hasStructuredData: (pa.structuredData?.types?.length > 0) || false
          });

          // Check if page already exists to preserve focus keyword and exclusion status
          const existingPage = await Page.findOne({ clientId, slug })
          const existingFocusKeyword = existingPage?.seo?.focusKeyword
          const existingExcluded = existingPage?.excluded
          
          // Auto-detect focus keyword if not already set
          let focusKeyword = existingFocusKeyword;
          if (!focusKeyword) {
            focusKeyword = this.detectFocusKeyword({
              title,
              h1,
              metaDescription,
              slug,
              sampleText: content.sampleText || ''
            });
          }
          
          // DEBUG: Log extracted title, score, and focus keyword
          console.log(`📝 Page: ${slug} | Title: "${title?.substring(0, 30) || 'EMPTY'}" | Score: ${calculatedSeoScore} | Focus: "${focusKeyword || 'none'}"`);

          const update = {
            clientId,
            url,
            slug,
            title: title?.substring(0, 200) || '', // Empty if no title found, not pathname
            metaDescription: metaDescription?.substring(0, 160) || '',
            h1,
            excluded: existingExcluded !== undefined ? existingExcluded : false, // Preserve existing exclusion status
            seo: {
              canonical: meta.canonical || undefined,
              robots: meta.robots || 'index,follow',
              focusKeyword: focusKeyword || undefined, // Use detected or existing focus keyword
              readabilityScore: undefined,
              seoScore: calculatedSeoScore, // Use calculated score
            },
            structuredData: {
              type: (() => {
                const allowedTypes = [
                  'Article', 'BlogPosting', 'Product', 'Organization', 'WebPage', 
                  'FAQPage', 'HowTo', 'Recipe', 'Event', 'LocalBusiness', 
                  'BreadcrumbList', 'Service', 'Person', 'VideoObject', 'ImageObject'
                ];
                const detectedType = (pa.structuredData?.types && pa.structuredData.types[0]) || 'WebPage';
                return allowedTypes.includes(detectedType) ? detectedType : 'WebPage';
              })(),
              schema: (pa.structuredData?.data && pa.structuredData.data[0]) || {},
            },
            openGraph: {
              title: social?.openGraph?.title || '',
              description: social?.openGraph?.description || '',
              image: social?.openGraph?.image || '',
              url,
              type: social?.openGraph?.type || 'website',
              siteName: social?.openGraph?.siteName || '',
            },
            twitter: {
              card: social?.twitter?.card || 'summary_large_image',
              title: social?.twitter?.title || '',
              description: social?.twitter?.description || '',
              image: social?.twitter?.image || '',
              site: social?.twitter?.site || '',
              creator: '',
            },
            content: {
              wordCount: content.wordCount || 0,
              readingTime: content.wordCount ? Math.max(1, Math.round(content.wordCount / 200)) : undefined,
              paragraphs: pa.content?.paragraphs || undefined,
              headings: {
                h1Count: headings.h1Count || 0,
                h2Count: Array.isArray(headings.structure) ? headings.structure.filter(h=>h.level===2).length : undefined,
                h3Count: Array.isArray(headings.structure) ? headings.structure.filter(h=>h.level===3).length : undefined,
              },
              links: {
                internal: pa.links?.internal?.count || 0,
                external: pa.links?.external?.count || 0,
                broken: pa.links?.potentiallyBroken || 0,
              },
              sample: content.sampleText?.substring(0, 2000) || undefined, // Expanded to 2000 chars
              // NEW: Content blocks extracted during audit (no need to recrawl)
              blocks: (content.blocks || []).slice(0, 50), // Up to 50 blocks
              // NEW: Internal links with anchor text
              internalLinks: (content.contentInternalLinks || []).slice(0, 100), // Up to 100 internal links
            },
            images: (images.details || []).slice(0, 20).map(img => ({ // Limit to 20 images per page
              url: img.src?.substring(0, 500) || '', // Limit URL length
              alt: img.alt?.substring(0, 200) || '', // Limit alt text
              width: (img.width && Number(img.width)) || undefined,
              height: (img.height && Number(img.height)) || undefined,
              optimized: !!img.hasLazyLoading,
            })),
            performance: {
              loadTime: (typeof pa.loadTime === 'number') ? pa.loadTime / 1000 : undefined,
              totalResources: perf.totalResources || undefined,
              firstContentfulPaint: undefined,
              largestContentfulPaint: undefined,
              cumulativeLayoutShift: undefined,
              timeToInteractive: undefined,
            },
            technical: {
              hasSSL: /^https:/i.test(url),
              isMobileFriendly: !!meta.viewport,
              hasViewport: !!meta.viewport,
              hasLanguage: !!meta.lang,
              hasCharset: !!meta.charset,
              responsiveImages: (images.withDimensions || 0) > 0,
              lazyLoading: (images.withLazyLoading || 0) > 0,
            },
          }

          // Upsert by clientId+slug using findOneAndUpdate
          await Page.findOneAndUpdate(
            { clientId, slug },
            { $set: update },
            { upsert: true, new: true }
          )
          
          return true
        } catch (e) {
          logger.error('Page persist error:', e)
          return null
        }
      })

      await Promise.allSettled(upserts)
    } catch (err) {
      logger.error('persistPages error:', err)
    }
  }

  /**
   * Discover pages from website
   */
  async discoverPages(baseUrl, maxPages = 200) {
    try {
      console.log(`🔍 Starting page discovery for: ${baseUrl} (max: ${maxPages} pages)`);
      const discoveredPages = [];
      const visited = new Set();
      const toVisit = [baseUrl];
      const normalizeHost = (h) => (h || '').toLowerCase().replace(/^www\./, '');
      const baseHost = (() => { try { return normalizeHost(new URL(baseUrl).hostname) } catch { return '' } })();
      let sitemapSeeded = false;
      // Protocol fallback (try both https and http to maximize discovery)
      try {
        const u = new URL(baseUrl)
        const alt = new URL(baseUrl)
        alt.protocol = u.protocol === 'https:' ? 'http:' : 'https:'
        const altUrl = alt.href
        if (!toVisit.includes(altUrl)) toVisit.push(altUrl)
      } catch {}

      // Seed from sitemap.xml or sitemap_index.xml if present
      const sitemapPaths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml'];
      for (const path of sitemapPaths) {
        try {
          const sitemapUrl = new URL(path, baseUrl).href;
          const sm = await axios.get(sitemapUrl, { timeout: 8000, validateStatus: () => true });
          if (sm.status === 200 && typeof sm.data === 'string') {
            const locs = Array.from(sm.data.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map(m => m[1]);
            locs.slice(0, 150).forEach(href => {
              try {
                const abs = this.resolveUrl(baseUrl, href);
                const host = normalizeHost(new URL(abs).hostname);
                // Filter out editor URLs from sitemap
                const isEditorUrl = abs.match(/[\?&](elementor-preview|wpr_templates|et_fb|fl_builder|vc_editable|tve|ct_builder|brizy-edit|beaver-builder)=/i);
                if ((host === baseHost) && !isEditorUrl && !toVisit.includes(abs)) toVisit.push(abs);
              } catch {}
            });
            console.log(`🗺️ Seeded ${Math.min(150, locs.length)} URLs from ${path}`);
            break; // Found a sitemap, stop checking
          }
        } catch (e) {
          // Continue to next sitemap path
        }
      }
      
      // Process pages in parallel batches for faster discovery
      const batchSize = 15; // Process 5 pages at once
      
      while (toVisit.length > 0 && discoveredPages.length < maxPages) {
        // Get batch of URLs to process
        const batchUrls = [];
        while (batchUrls.length < batchSize && toVisit.length > 0 && discoveredPages.length + batchUrls.length < maxPages) {
          const url = toVisit.shift();
          if (!visited.has(url)) {
            visited.add(url);
            batchUrls.push(url);
          }
        }
        
        if (batchUrls.length === 0) break;
        
        console.log(`� Processing batch of ${batchUrls.length} pages (${discoveredPages.length + 1}-${discoveredPages.length + batchUrls.length}/${maxPages})`);
        
        // Process batch in parallel
        const batchResults = await Promise.allSettled(
          batchUrls.map(async (currentUrl) => {
            try {
              const response = await axios.get(currentUrl, { 
                timeout: 15000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0; +https://seo-audit.example.com)'
                }
              });
              
              const $ = cheerio.load(response.data);
              const title = $('title').text().trim();
              const metaDescription = $('meta[name="description"]').attr('content') || '';
              const h1 = $('h1').first().text().trim();
              const robots = $('meta[name="robots"]').attr('content') || '';
              
              // Remove scripts, styles, and other non-content elements for clean text
              $('script, style, noscript, iframe, svg').remove();
              
              // Get content preview
              const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
              const contentPreview = bodyText.substring(0, 500);
              const wordCount = bodyText.split(' ').filter(w => w.length > 0).length;
              
              const pageData = {
                url: currentUrl,
                title: title,
                h1: h1,
                metaDescription: metaDescription,
                statusCode: response.status,
                contentLength: response.data.length,
                contentType: response.headers['content-type'] || '',
                wordCount: wordCount,
                contentPreview: contentPreview,
                robots: robots,
                isIndexable: !robots.toLowerCase().includes('noindex'),
                discoveredAt: new Date(),
                issues: []
              };
              
              // Detect immediate SEO issues
              if (!title) pageData.issues.push('Missing Title');
              if (title && title.length < 30) pageData.issues.push('Title Too Short');
              if (title && title.length > 60) pageData.issues.push('Title Too Long');
              if (!metaDescription) pageData.issues.push('Missing Meta Description');
              if (metaDescription && metaDescription.length < 120) pageData.issues.push('Meta Description Too Short');
              if (!h1) pageData.issues.push('Missing H1');
              if (wordCount < 300) pageData.issues.push('Thin Content');
              
              // Find internal links
              const newLinks = [];
              $('a[href]').each((i, element) => {
                const href = $(element).attr('href');
                if (href) {
                  const absoluteUrl = this.resolveUrl(baseUrl, href);
                  try {
                    const urlObj = new URL(absoluteUrl);
                    const baseUrlObj = new URL(baseUrl);
                    const currentHost = normalizeHost(new URL(currentUrl).hostname);
                    const linkHost = normalizeHost(urlObj.hostname);
                    const baseHostN = normalizeHost(baseUrlObj.hostname);
                    
                    // Filter out editor/preview URLs and non-page URLs
                    const isEditorUrl = absoluteUrl.match(/[\?&](elementor-preview|wpr_templates|et_fb|fl_builder|vc_editable|tve|ct_builder|brizy-edit|beaver-builder)=/i);
                    const isAdminUrl = absoluteUrl.match(/\/wp-admin\/|\/wp-login\.php|\/wp-content\//i);
                    const isFeedUrl = absoluteUrl.match(/\/feed\/?$|\/rss\/?$/i);
                    const isFileUrl = absoluteUrl.match(/\.(pdf|jpg|jpeg|png|gif|css|js|zip|xml|txt|ico|svg|woff|woff2|ttf|eot)$/i);
                    
                    if ((linkHost === baseHostN || linkHost === currentHost) && 
                        !absoluteUrl.includes('#') &&
                        !isEditorUrl &&
                        !isAdminUrl &&
                        !isFeedUrl &&
                        !isFileUrl &&
                        !visited.has(absoluteUrl) &&
                        !toVisit.includes(absoluteUrl)) {
                      newLinks.push(absoluteUrl);
                    }
                  } catch (urlError) {
                    // Invalid URL, skip
                  }
                }
              });
              
              return { success: true, pageData, newLinks };
              
            } catch (error) {
              console.warn(`⚠️ Could not access page: ${currentUrl}`, error.message);
              return {
                success: false,
                pageData: {
                  url: currentUrl,
                  title: 'Error Loading Page',
                  statusCode: error.response?.status || 0,
                  error: error.message,
                  issues: ['Page Load Error'],
                  discoveredAt: new Date()
                },
                newLinks: []
              };
            }
          })
        );
        
        // Process results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const { pageData, newLinks } = result.value;
            discoveredPages.push(pageData);
            
            console.log(`✅ Page ${discoveredPages.length}: ${pageData.url}`);
            console.log(`   Title: ${pageData.title || '(missing)'} | H1: ${pageData.h1 || '(missing)'} | Words: ${pageData.wordCount || 0}`);
            if (pageData.issues.length > 0) {
              console.log(`   Issues: ${pageData.issues.join(', ')}`);
            }
            
            // Add new links to queue (limit to prevent memory issues)
            if (toVisit.length < 200) {
              newLinks.slice(0, 50).forEach(link => {
                if (!toVisit.includes(link)) {
                  toVisit.push(link);
                }
              });
            }
          }
        });
        
        // One-time sitemap seeding (only on first batch)
        if (!sitemapSeeded) {
          sitemapSeeded = true;
          const sitemapPaths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml'];
          
          for (const path of sitemapPaths) {
            try {
              const smUrl = new URL(path, baseUrl).href;
              const smRes = await axios.get(smUrl, { timeout: 7000, validateStatus: () => true });
              if (smRes.status === 200) {
                const $$ = cheerio.load(smRes.data, { xmlMode: true });
                const addToQueue = (locUrl) => {
                  try {
                    const u = new URL(locUrl);
                    if (normalizeHost(u.hostname) !== baseHost) return;
                    const isEditorUrl = locUrl.match(/[\?&](elementor-preview|wpr_templates|et_fb|fl_builder|vc_editable|tve|ct_builder|brizy-edit|beaver-builder)=/i);
                    if (isEditorUrl) return;
                    if (!visited.has(locUrl) && !toVisit.includes(locUrl) && toVisit.length < 200) toVisit.push(locUrl);
                  } catch {}
                };
                
                const indexLocs = $$('sitemap > loc');
                if (indexLocs.length > 0) {
                  const childLocs = indexLocs.map((i, el) => $$(el).text().trim()).get().slice(0, 5);
                  await Promise.allSettled(childLocs.map(async (loc) => {
                    try {
                      const csRes = await axios.get(loc, { timeout: 7000, validateStatus: () => true });
                      if (csRes.status === 200) {
                        const $$$ = cheerio.load(csRes.data, { xmlMode: true });
                        $$$('url > loc').each((i, el) => addToQueue($$$(el).text().trim()));
                      }
                    } catch {}
                  }));
                } else {
                  $$('url > loc').each((i, el) => addToQueue($$(el).text().trim()));
                }
                console.log(`🗺️  Sitemap seeding done from ${path}. Queue size: ${toVisit.length}`);
                break; // Found a sitemap, stop checking
              }
            } catch (e) {
              // Continue to next sitemap path
            }
          }
        }
      }
      
      console.log('🎉 Page discovery completed. Found', discoveredPages.length, 'pages');
      console.log('📊 Total issues found:', discoveredPages.reduce((sum, p) => sum + (p.issues?.length || 0), 0));
      return discoveredPages;
    } catch (error) {
      console.error('❌ Page discovery error:', error);
      return [];
    }
  }

  /**
   * Analyze individual page for SEO with comprehensive opportunity detection
   */
  async analyzePageSEO(url, baseUrl, enableDeepAnalysis = true) {
    try {
      // Add random delay before making request to avoid rate limiting
      await randomDelay(500, 1500);
      
      const response = await axios.get(url, { 
        timeout: 20000,
        headers: {
          'User-Agent': getNextUserAgent(), // Use rotating user agents
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        validateStatus: () => true, // Accept all status codes
        maxRedirects: 5
      });
      
      // Handle non-200 responses
      if (response.status >= 400) {
        console.warn(`⚠️ Page returned ${response.status}: ${url}`);
        return {
          url: url,
          statusCode: response.status,
          error: `HTTP ${response.status}`,
          seoAnalysis: {
            criticalIssues: [`Page returned HTTP ${response.status} status`],
            opportunities: [],
            recommendations: [],
            seoScore: 0
          },
          analyzedAt: new Date()
        };
      }
      
      const $ = cheerio.load(response.data);
      
      // Meta Information
      const title = $('title').text().trim();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
  const canonicalTags = $('link[rel="canonical"]');
  const canonicalCount = canonicalTags.length;
  const canonical = canonicalCount > 0 ? (canonicalTags.first().attr('href') || '') : '';
      const robots = $('meta[name="robots"]').attr('content') || '';
      const viewport = $('meta[name="viewport"]').attr('content') || '';
      const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content') || '';
      const lang = $('html').attr('lang') || '';
      
      // Open Graph Tags
      const ogTitle = $('meta[property="og:title"]').attr('content') || '';
      const ogDescription = $('meta[property="og:description"]').attr('content') || '';
      const ogImage = $('meta[property="og:image"]').attr('content') || '';
      const ogUrl = $('meta[property="og:url"]').attr('content') || '';
      const ogType = $('meta[property="og:type"]').attr('content') || '';
      const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';
      
      // Twitter Card Tags
      const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';
      const twitterTitle = $('meta[name="twitter:title"]').attr('content') || '';
      const twitterDescription = $('meta[name="twitter:description"]').attr('content') || '';
      const twitterImage = $('meta[name="twitter:image"]').attr('content') || '';
      const twitterSite = $('meta[name="twitter:site"]').attr('content') || '';
      
      // Heading Structure with full text
      const headings = [];
      const h1Elements = [];
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        $(tag).each((i, element) => {
          const text = $(element).text().trim();
          headings.push({
            tag: tag.toUpperCase(),
            text: text,
            level: parseInt(tag.substring(1))
          });
          if (tag === 'h1') {
            h1Elements.push(text);
          }
        });
      });
      
      // Images Analysis with detailed info
      const images = [];
      $('img').each((i, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        const title = $(element).attr('title') || '';
        const width = $(element).attr('width') || '';
        const height = $(element).attr('height') || '';
        const loading = $(element).attr('loading') || '';
        
        images.push({
          src: src ? this.resolveUrl(baseUrl, src) : '',
          alt: alt,
          title: title,
          width: width,
          height: height,
          loading: loading,
          hasAlt: !!alt,
          altLength: alt.length,
          hasLazyLoading: loading === 'lazy',
          hasDimensions: !!(width && height)
        });
      });
      
      // Links Analysis with more details
      const internalLinks = [];
      const externalLinks = [];
      const brokenLinkCandidates = [];
      
      $('a[href]').each((i, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        const title = $(element).attr('title') || '';
        const rel = $(element).attr('rel') || '';
        
        if (href) {
          try {
            const absoluteUrl = this.resolveUrl(baseUrl, href);
            const urlObj = new URL(absoluteUrl);
            const baseUrlObj = new URL(baseUrl);
            
            const linkData = {
              href: absoluteUrl,
              text: text,
              title: title,
              rel: rel,
              isNofollow: rel.includes('nofollow'),
              isSponsored: rel.includes('sponsored'),
              isUGC: rel.includes('ugc'),
              hasAnchorText: !!text,
              anchorTextLength: text.length
            };
            
            if (urlObj.hostname === baseUrlObj.hostname) {
              internalLinks.push(linkData);
            } else {
              externalLinks.push(linkData);
            }
            
            // Check for potential broken links
            if (href.includes('404') || href.includes('error') || href === '#') {
              brokenLinkCandidates.push(linkData);
            }
          } catch (e) {
            // Invalid URL
            brokenLinkCandidates.push({
              href: href,
              text: text,
              error: 'Invalid URL'
            });
          }
        }
      });
      
      // Schema/Structured Data
      const structuredData = [];
      $('script[type="application/ld+json"]').each((i, element) => {
        try {
          const jsonData = JSON.parse($(element).text());
          structuredData.push(jsonData);
        } catch (e) {
          // Invalid JSON
        }
      });
      
      // Performance indicators
      const cssFiles = [];
      $('link[rel="stylesheet"]').each((i, element) => {
        cssFiles.push($(element).attr('href'));
      });
      
      const jsFiles = [];
      $('script[src]').each((i, element) => {
        jsFiles.push($(element).attr('src'));
      });
      
      // Remove scripts, styles, and other non-content for clean analysis
      $('script, style, noscript, iframe, svg').remove();
      
      // ============================================
      // ENHANCED CONTENT EXTRACTION (for Page Optimizer)
      // Extract structured content blocks during audit
      // ============================================
      
      // Try to find main content area first for cleaner extraction
      let $contentArea = $('main, [role="main"], article, .content, #content, .main-content, #main-content, .post-content, .entry-content');
      if ($contentArea.length === 0) {
        $contentArea = $('body');
      }
      
      // Extract content blocks (h1-h6, p elements)
      const contentBlocks = [];
      $contentArea.find('h1, h2, h3, h4, h5, h6, p').each((i, el) => {
        if (contentBlocks.length >= 50) return false; // Limit blocks
        const tag = el.tagName ? String(el.tagName).toLowerCase() : $(el).get(0)?.tagName?.toLowerCase();
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (!text || text.length < 10) return; // Skip very short text
        contentBlocks.push({ tag, text });
      });
      
      // Fallback: try divs/sections if no blocks found
      if (contentBlocks.length === 0) {
        $contentArea.find('div, section, article, li').each((i, el) => {
          if (contentBlocks.length >= 50) return false;
          const $el = $(el);
          const text = $el.clone().children().remove().end().text().replace(/\s+/g, ' ').trim();
          if (!text || text.length < 15) return;
          contentBlocks.push({ tag: 'div', text });
        });
      }
      
      // Extract internal links with anchor text for Page Optimizer
      const contentInternalLinks = [];
      const pageHost = (() => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, '') } catch { return '' } })();
      $contentArea.find('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        const anchorText = $(el).text().replace(/\s+/g, ' ').trim();
        const rel = $(el).attr('rel') || '';
        if (!href || !anchorText) return;
        try {
          const absoluteUrl = new URL(href, url).href;
          const linkHost = new URL(absoluteUrl).hostname.toLowerCase().replace(/^www\./, '');
          if (linkHost === pageHost && !absoluteUrl.includes('#') && contentInternalLinks.length < 100) {
            contentInternalLinks.push({
              url: absoluteUrl,
              anchorText: anchorText.substring(0, 200),
              isNofollow: rel.includes('nofollow')
            });
          }
        } catch {}
      });
      
      // ============================================
      // END ENHANCED CONTENT EXTRACTION
      // ============================================
      
  // Content Analysis with more details
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      const wordCount = bodyText.split(' ').filter(w => w.length > 0).length;
      const paragraphs = $('p').length;
      const lists = $('ul, ol').length;
      const tables = $('table').length;
      
      // Check for videos
      const videos = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
      
      // Check for forms
      const forms = $('form').length;
      
      // SEO Opportunities Detection
      const seoOpportunities = [];
      const criticalIssues = [];
      const recommendations = [];
      
      // Title opportunities
      if (!title) {
        criticalIssues.push('🔴 CRITICAL: Missing title tag - add unique, descriptive title');
      } else if (title.length < 30) {
        seoOpportunities.push('📝 Title is too short (under 30 chars) - expand for better SEO');
      } else if (title.length > 60) {
        seoOpportunities.push('✂️ Title is too long (over 60 chars) - will be truncated in search results');
      }
      
      // Meta description opportunities
      if (!metaDescription) {
        criticalIssues.push('🔴 CRITICAL: Missing meta description - add compelling 120-160 char description');
      } else if (metaDescription.length < 120) {
        seoOpportunities.push('📝 Meta description is short - expand to 120-160 chars for better CTR');
      } else if (metaDescription.length > 160) {
        seoOpportunities.push('✂️ Meta description is too long - will be truncated in search results');
      }
      
      // H1 opportunities
      if (h1Elements.length === 0) {
        criticalIssues.push('🔴 CRITICAL: Missing H1 tag - add clear, keyword-rich heading');
      } else if (h1Elements.length > 1) {
        seoOpportunities.push(`⚠️ Multiple H1 tags found (${h1Elements.length}) - use only one H1 per page`);
      }
      
      // Content opportunities
      if (wordCount < 300) {
        criticalIssues.push(`🔴 CRITICAL: Thin content (${wordCount} words) - add at least 300 words for better ranking`);
      } else if (wordCount < 500) {
        seoOpportunities.push(`📝 Content could be expanded (${wordCount} words) - aim for 500+ words`);
      } else if (wordCount > 2000) {
        recommendations.push(`✅ Excellent content length (${wordCount} words)`);
      }
      
      // Image opportunities
      const imagesWithoutAlt = images.filter(img => !img.hasAlt).length;
      if (imagesWithoutAlt > 0) {
        criticalIssues.push(`🖼️ ${imagesWithoutAlt} images missing alt text - critical for accessibility and SEO`);
      }
      
      const imagesWithoutLazyLoad = images.filter(img => !img.hasLazyLoading).length;
      if (imagesWithoutLazyLoad > 3) {
        seoOpportunities.push(`⚡ ${imagesWithoutLazyLoad} images without lazy loading - add loading="lazy" for performance`);
      }
      
      // Link opportunities
      if (internalLinks.length === 0) {
        seoOpportunities.push('🔗 No internal links found - add links to other pages for better site structure');
      } else if (internalLinks.length < 3) {
        seoOpportunities.push(`🔗 Only ${internalLinks.length} internal links - add more for better internal linking`);
      }
      
      const externalNofollow = externalLinks.filter(l => l.isNofollow).length;
      const externalDofollow = externalLinks.length - externalNofollow;
      if (externalDofollow > 5) {
        seoOpportunities.push(`🌐 ${externalDofollow} external dofollow links - consider adding nofollow to some`);
      }
      
      // Social media opportunities
      if (!ogTitle || !ogDescription || !ogImage) {
        seoOpportunities.push('📱 Incomplete Open Graph tags - add for better social media sharing');
      }
      
      if (!twitterCard) {
        seoOpportunities.push('🐦 Missing Twitter Card tags - add for better Twitter sharing');
      }
      
      // Technical opportunities
      if (!canonical) {
        seoOpportunities.push('🔗 Missing canonical URL - add to prevent duplicate content issues');
      }
      
      if (!viewport) {
        criticalIssues.push('📱 CRITICAL: Missing viewport meta tag - essential for mobile responsiveness');
      }
      
      if (!charset) {
        seoOpportunities.push('🔤 Missing charset declaration - add <meta charset="utf-8">');
      }
      
      if (!lang) {
        seoOpportunities.push('🌍 Missing HTML lang attribute - specify language for better accessibility');
      }
      
      if (structuredData.length === 0) {
        seoOpportunities.push('📊 No structured data found - add Schema.org markup for rich snippets');
      }
      
      // Performance opportunities
      if (cssFiles.length > 5) {
        seoOpportunities.push(`🎨 ${cssFiles.length} CSS files loaded - consider combining for better performance`);
      }
      
      if (jsFiles.length > 10) {
        seoOpportunities.push(`⚙️ ${jsFiles.length} JS files loaded - consider combining and minifying`);
      }
      
      // Build explicit per-page checks to expose PASS/FAIL/UNKNOWN
      const isHttps = (() => { try { return new URL(url).protocol === 'https:' } catch (e) { return false } })();
      const htmlRaw = response.data || '';
      const hasAnalytics = /googletagmanager\.com|google-analytics\.com|gtag\(|dataLayer\s*=|gtm\.js/i.test(htmlRaw);
      const totalJsonLdTags = $('script[type="application/ld+json"]').length;
      const invalidJsonLdCount = Math.max(0, totalJsonLdTags - (structuredData.length || 0));

      // Mixed content on HTTPS pages
      const httpJs = jsFiles.map(src => this.resolveUrl(baseUrl, src || '')).filter(u => /^http:/.test(u));
      const httpCss = cssFiles.map(href => this.resolveUrl(baseUrl, href || '')).filter(u => /^http:/.test(u));
      const httpImgs = images.map(img => img.src || '').filter(u => /^http:/.test(u));
      const mixedContentCount = isHttps ? (httpJs.length + httpCss.length + httpImgs.length) : 0;

      // Page responds with redirect? (skip on low memory)
      let pageRedirects = null;
      if (enableDeepAnalysis) {
        try {
          const noRedirect = await axios.get(url, { timeout: 5000, maxRedirects: 0, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0; +https://seo-audit.example.com)'} });
          pageRedirects = (noRedirect.status >= 300 && noRedirect.status < 400) ? true : false;
        } catch (e) {
          pageRedirects = null;
        }
      }

      // Sample a few links for broken status (skip on low memory)
      const sampleLinks = [...internalLinks.slice(0, 5), ...externalLinks.slice(0, 5)];
      let brokenSampleCount = 0;
      if (enableDeepAnalysis) {
        await Promise.allSettled(sampleLinks.map(async (l) => {
          try {
            const head = await axios.head(l.href, { timeout: 5000, validateStatus: () => true });
            if (head.status >= 400) brokenSampleCount += 1;
          } catch (e) {
            brokenSampleCount += 1;
          }
        }));
      }

      // Mobile-friendly (viewport)
      const hasViewport = !!$('meta[name="viewport"]').attr('content');
      const mobileFriendly = hasViewport && /width\s*=\s*device-width/i.test(viewport || '');

      // Compose checks array
      const checks = [];
      const pushCheck = (key, category, label, status, recommendation, note) => { checks.push({ key, category, label, status, recommendation, note }); };
      pushCheck('https', 'Technical • Security', 'HTTPS enabled', isHttps ? 'PASS' : 'FAIL', 'Serve all pages over HTTPS with valid certificate');
      pushCheck('mixed-content', 'Technical • Security', 'No mixed content', !isHttps ? 'UNKNOWN' : (mixedContentCount > 0 ? 'FAIL' : 'PASS'), 'Ensure all scripts, styles, and images load over HTTPS', mixedContentCount > 0 ? `${mixedContentCount} HTTP resources` : undefined);
      pushCheck('mobile-friendly', 'Technical • Mobile Optimization', 'Mobile-friendly & responsive', mobileFriendly ? 'PASS' : 'FAIL', 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> and use responsive CSS');
      pushCheck('page-redirects', 'Technical • Links', 'Redirects configured; no chains', pageRedirects === null ? 'UNKNOWN' : (pageRedirects ? 'FAIL' : 'PASS'), 'Avoid unnecessary redirects to reduce latency');
      pushCheck('broken-links', 'Technical • Links', 'No broken links (404)', brokenSampleCount > 0 ? 'FAIL' : 'PASS', 'Remove or update broken links', brokenSampleCount > 0 ? `${brokenSampleCount} broken of ${sampleLinks.length} sampled` : `Sampled ${sampleLinks.length}`);
      pushCheck('schema-present', 'On-Page • Schema', 'Structured data (JSON-LD) implemented', structuredData.length > 0 ? 'PASS' : 'FAIL', 'Add relevant Schema.org JSON-LD to qualify for rich results');
      pushCheck('schema-valid', 'On-Page • Schema', 'Structured data is valid JSON-LD', structuredData.length === 0 ? 'UNKNOWN' : (invalidJsonLdCount > 0 ? 'FAIL' : 'PASS'), 'Validate JSON-LD in Google Rich Results Test', invalidJsonLdCount > 0 ? `${invalidJsonLdCount} invalid blocks` : undefined);
      pushCheck('analytics-present', 'Off-Page & UX • Analytics', 'Analytics/Search Console/Conversions tracking', hasAnalytics ? 'PASS' : 'FAIL', 'Install Google Analytics or Tag Manager to measure performance');
      
      return {
        url: url,
        statusCode: response.status,
        loadTime: response.headers['x-response-time'] || null,
        
        // Meta Data with opportunities
        metaData: {
          title: {
            text: title,
            length: title.length,
            isEmpty: !title,
            isTooShort: title.length < 30,
            isTooLong: title.length > 60,
            isOptimal: title.length >= 30 && title.length <= 60
          },
          description: {
            text: metaDescription,
            length: metaDescription.length,
            isEmpty: !metaDescription,
            isTooShort: metaDescription.length < 120,
            isTooLong: metaDescription.length > 160,
            isOptimal: metaDescription.length >= 120 && metaDescription.length <= 160
          },
          keywords: metaKeywords,
          canonical: canonical,
          canonicalCount: canonicalCount,
          robots: robots,
          viewport: viewport,
          charset: charset,
          lang: lang
        },
        
        // Social Media Tags
        socialTags: {
          openGraph: {
            title: ogTitle,
            description: ogDescription,
            image: ogImage,
            url: ogUrl,
            type: ogType,
            siteName: ogSiteName,
            isComplete: !!(ogTitle && ogDescription && ogImage)
          },
          twitter: {
            card: twitterCard,
            title: twitterTitle,
            description: twitterDescription,
            image: twitterImage,
            site: twitterSite,
            isComplete: !!(twitterCard && twitterTitle)
          }
        },
        
        // Content Structure
        headings: {
          structure: headings,
          h1Count: h1Elements.length,
          h1Text: h1Elements,
          hasH1: h1Elements.length > 0,
          hasMultipleH1: h1Elements.length > 1,
          totalHeadings: headings.length
        },
        
        // Images
        images: {
          total: images.length,
          withAlt: images.filter(img => img.hasAlt).length,
          withoutAlt: images.filter(img => !img.hasAlt).length,
          withLazyLoading: images.filter(img => img.hasLazyLoading).length,
          withDimensions: images.filter(img => img.hasDimensions).length,
          details: images
        },
        
        // Links
        links: {
          internal: {
            count: internalLinks.length,
            details: internalLinks
          },
          external: {
            count: externalLinks.length,
            dofollow: externalDofollow,
            nofollow: externalNofollow,
            details: externalLinks
          },
          potentiallyBroken: brokenLinkCandidates.length
        },
        
        // Structured Data
        structuredData: {
          count: structuredData.length,
          types: structuredData.map(s => s['@type']).filter(Boolean),
          data: structuredData
        },
        
        // Performance
        performance: {
          cssFiles: cssFiles.length,
          jsFiles: jsFiles.length,
          totalResources: cssFiles.length + jsFiles.length,
          htmlSize: response.data.length
        },
        
        // Content (ENHANCED - includes blocks for Page Optimizer)
        content: {
          wordCount: wordCount,
          paragraphs: paragraphs,
          lists: lists,
          tables: tables,
          videos: videos,
          forms: forms,
          textLength: bodyText.length,
          htmlSize: response.data.length,
          sampleText: bodyText.substring(0, 2000),
          contentDensity: (wordCount / response.data.length * 100).toFixed(2) + '%',
          // NEW: Structured content blocks for Page Optimizer
          blocks: contentBlocks,
          // NEW: Internal links with anchor text
          contentInternalLinks: contentInternalLinks
        },
        
        // SEO Opportunities & Issues
        seoAnalysis: {
          criticalIssues: criticalIssues,
          opportunities: seoOpportunities,
          recommendations: recommendations,
          totalIssues: criticalIssues.length + seoOpportunities.length,
          seoScore: this.calculatePageSEOScore({
            hasTitle: !!title,
            titleLength: title.length,
            hasDescription: !!metaDescription,
            descriptionLength: metaDescription.length,
            hasH1: h1Elements.length === 1,
            wordCount: wordCount,
            imagesWithAlt: images.filter(img => img.hasAlt).length,
            totalImages: images.length,
            internalLinks: internalLinks.length,
            hasStructuredData: structuredData.length > 0
          })
        },
        
        // Explicit checks for frontend consumption
        checks,
        analyzedAt: new Date()
      };
      
    } catch (error) {
      // More detailed error logging
      const errorType = error.code || error.message;
      const errorMsg = error.code === 'ECONNABORTED' ? 'Request timeout' :
                       error.code === 'ENOTFOUND' ? 'Domain not found' :
                       error.code === 'ECONNREFUSED' ? 'Connection refused' :
                       error.message || 'Unknown error';
      
      console.warn(`❌ Error analyzing ${url}: ${errorMsg}`);
      
      return {
        url: url,
        error: errorMsg,
        errorCode: error.code,
        seoAnalysis: {
          criticalIssues: [`Failed to analyze page: ${errorMsg}`],
          opportunities: [],
          recommendations: [],
          seoScore: 0
        },
        analyzedAt: new Date()
      };
    }
  }

  /**
   * Calculate page-level SEO score
   */
  calculatePageSEOScore(metrics) {
    let score = 100;
    
    // Title (20 points)
    if (!metrics.hasTitle) score -= 20;
    else if (metrics.titleLength < 30 || metrics.titleLength > 60) score -= 10;
    
    // Description (20 points)
    if (!metrics.hasDescription) score -= 20;
    else if (metrics.descriptionLength < 120 || metrics.descriptionLength > 160) score -= 10;
    
    // H1 (15 points)
    if (!metrics.hasH1) score -= 15;
    
    // Content (20 points)
    if (metrics.wordCount < 300) score -= 20;
    else if (metrics.wordCount < 500) score -= 10;
    
    // Images (10 points)
    if (metrics.totalImages > 0) {
      const altRatio = metrics.imagesWithAlt / metrics.totalImages;
      score -= (1 - altRatio) * 10;
    }
    
    // Internal Links (10 points)
    if (metrics.internalLinks === 0) score -= 10;
    else if (metrics.internalLinks < 3) score -= 5;
    
    // Structured Data (5 points)
    if (!metrics.hasStructuredData) score -= 5;
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Automatically detect the best focus keyword for a page
   * Analyzes title, H1, meta description, URL slug, and content to suggest a focus keyword
   * @param {Object} pageData - Object containing title, h1, metaDescription, slug, content
   * @returns {string|null} - Suggested focus keyword or null if none found
   */
  detectFocusKeyword(pageData) {
    const { title = '', h1 = '', metaDescription = '', slug = '', sampleText = '' } = pageData;
    
    // Skip detection for homepage or utility pages
    if (slug === '__root__' || slug === '' || slug === '/') {
      return null;
    }
    
    // Common stop words to filter out
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
      'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then',
      'once', 'here', 'there', 'any', 'our', 'your', 'their', 'my', 'his', 'her', 'up',
      'down', 'out', 'off', 'over', 'under', 'also', 'get', 'got', 'new', 'best', 'top',
      'page', 'home', 'site', 'website', 'blog', 'post', 'article', 'read', 'click', 'learn'
    ]);
    
    // Extract potential keywords from different sources with weights
    const keywordCandidates = new Map(); // keyword -> score
    
    // Helper to extract and score n-grams (1-4 words)
    const extractKeywords = (text, weight) => {
      if (!text || typeof text !== 'string') return;
      
      // Clean and normalize text
      const cleanText = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const words = cleanText.split(' ').filter(w => w.length > 2 && !stopWords.has(w));
      
      // Single words (unigrams)
      words.forEach(word => {
        if (word.length >= 3) {
          const current = keywordCandidates.get(word) || 0;
          keywordCandidates.set(word, current + weight * 0.5);
        }
      });
      
      // 2-word phrases (bigrams) - most common for focus keywords
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        if (bigram.length >= 5) {
          const current = keywordCandidates.get(bigram) || 0;
          keywordCandidates.set(bigram, current + weight);
        }
      }
      
      // 3-word phrases (trigrams)
      for (let i = 0; i < words.length - 2; i++) {
        const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        if (trigram.length >= 8 && trigram.length <= 40) {
          const current = keywordCandidates.get(trigram) || 0;
          keywordCandidates.set(trigram, current + weight * 0.8);
        }
      }
    };
    
    // Extract from URL slug (high weight - usually reflects main topic)
    const slugText = slug.replace(/[-_]/g, ' ').replace(/\//g, ' ');
    extractKeywords(slugText, 3);
    
    // Extract from H1 (highest weight - primary heading)
    extractKeywords(h1, 4);
    
    // Extract from title (high weight)
    // Remove common suffixes like "| Company Name" or "- Brand"
    const cleanTitle = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim();
    extractKeywords(cleanTitle, 3.5);
    
    // Extract from meta description (medium weight)
    extractKeywords(metaDescription, 2);
    
    // Extract from content sample (lower weight but helps confirm)
    if (sampleText) {
      extractKeywords(sampleText.substring(0, 500), 1);
    }
    
    // Find the best keyword candidate
    let bestKeyword = null;
    let bestScore = 0;
    
    keywordCandidates.forEach((score, keyword) => {
      // Prefer 2-3 word phrases over single words
      const wordCount = keyword.split(' ').length;
      let adjustedScore = score;
      
      // Boost 2-word phrases (ideal for SEO)
      if (wordCount === 2) adjustedScore *= 1.3;
      // Slight boost for 3-word phrases
      else if (wordCount === 3) adjustedScore *= 1.1;
      // Penalize very long phrases
      else if (wordCount > 4) adjustedScore *= 0.5;
      // Penalize single words slightly
      else if (wordCount === 1) adjustedScore *= 0.7;
      
      // Penalize very short or very long keywords
      if (keyword.length < 4) adjustedScore *= 0.3;
      else if (keyword.length > 50) adjustedScore *= 0.5;
      
      // Bonus if keyword appears in multiple sources (already factored in by cumulative scoring)
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestKeyword = keyword;
      }
    });
    
    // Only return if we have a reasonably confident match
    if (bestScore >= 2 && bestKeyword) {
      // Capitalize first letter of each word for display
      return bestKeyword
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return null;
  }

  /**
   * Analyze Core Web Vitals
   */
  async analyzeCoreWebVitals(baseUrl) {
    // Note: This is a placeholder. In a real implementation, you would integrate
    // with Google PageSpeed Insights API or Lighthouse
    try {
      return [{
        type: 'Core Web Vitals',
        message: 'PageSpeed analysis requires Google PageSpeed Insights API integration',
        severity: 'Info',
        recommendation: 'Integrate with Google PageSpeed Insights API for detailed performance metrics'
      }];
    } catch (error) {
      return [];
    }
  }

  /**
   * Aggregate data from individual page analyses
   */
  aggregatePageData(results) {
    if (!results.pageAnalysis || results.pageAnalysis.length === 0) return;
    
    // Aggregate meta analysis
    results.metaAnalysis = results.pageAnalysis.map(page => ({
      url: page.url,
      title: page.metaData?.title?.content || page.metaData?.title?.text || '',
      description: page.metaData?.description?.content || page.metaData?.description?.text || '',
      issues: [
        ...(page.metaData?.title?.isEmpty ? [{
          type: 'Missing Title',
          severity: 'Critical',
          message: 'Page has no title tag'
        }] : []),
        ...(page.metaData?.title?.isTooShort ? [{
          type: 'Short Title',
          severity: 'Medium',
          message: 'Title is too short (less than 30 characters)'
        }] : []),
        ...(page.metaData?.title?.isTooLong ? [{
          type: 'Long Title',
          severity: 'Medium',
          message: 'Title is too long (more than 60 characters)'
        }] : []),
        ...(page.metaData?.description?.isEmpty ? [{
          type: 'Missing Meta Description',
          severity: 'High',
          message: 'Page has no meta description'
        }] : []),
        ...(page.metaData?.description?.isTooShort ? [{
          type: 'Short Meta Description',
          severity: 'Low',
          message: 'Meta description is too short (less than 120 characters)'
        }] : []),
        ...(page.metaData?.description?.isTooLong ? [{
          type: 'Long Meta Description',
          severity: 'Low',
          message: 'Meta description is too long (more than 160 characters)'
        }] : [])
      ]
    }));
    
    // Aggregate heading structure
    results.headingStructure = results.pageAnalysis.map(page => ({
      url: page.url,
      headings: page.headings?.structure || [],
      issues: [
        ...(page.headings?.hasMultipleH1 ? [{
          type: 'Multiple H1 Tags',
          severity: 'Medium',
          message: 'Page has multiple H1 tags'
        }] : []),
        ...(!page.headings?.hasH1 ? [{
          type: 'Missing H1 Tag',
          severity: 'High',
          message: 'Page has no H1 tag'
        }] : [])
      ]
    }));
    
    // Aggregate image analysis
    results.imageAnalysis = results.pageAnalysis.map(page => ({
      url: page.url,
      totalImages: page.images?.total || 0,
      imagesWithAlt: page.images?.withAlt || 0,
      imagesWithoutAlt: page.images?.withoutAlt || 0,
      images: page.images?.details || [],
      issues: page.images?.withoutAlt > 0 ? [{
        type: 'Missing Alt Tags',
        severity: 'Medium',
        message: `${page.images.withoutAlt} images missing alt tags`,
        count: page.images.withoutAlt
      }] : []
    }));
    
    // Aggregate link analysis
    results.linkAnalysis = results.pageAnalysis.map(page => ({
      url: page.url,
      internalLinks: page.links?.internal?.count || 0,
      externalLinks: page.links?.external?.count || 0,
      linkDetails: {
        internal: page.links?.internal?.details || [],
        external: page.links?.external?.details || []
      }
    }));
    
    // Aggregate content analysis
    results.contentAnalysis = results.pageAnalysis.map(page => ({
      url: page.url,
      wordCount: page.content?.wordCount || 0,
      textLength: page.content?.textLength || 0,
      htmlSize: page.content?.htmlSize || 0,
      issues: [
        ...(page.content?.wordCount < 300 ? [{
          type: 'Low Word Count',
          severity: 'Low',
          message: `Page has low word count (${page.content.wordCount} words)`
        }] : [])
      ]
    }));
  }

  /**
   * Check for broken links
   */
  async checkBrokenLinks(url) {
    try {
      const response = await axios.get(url, { timeout: 10000, validateStatus: () => true });
      const $ = cheerio.load(response.data);
      const links = [];
      const broken = [];

      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && (href.startsWith('http') || href.startsWith('/'))) {
          links.push({
            url: this.resolveUrl(url, href),
            foundOn: url,
          });
        }
      });

      // Check first 50 links to avoid long processing
      const linksToCheck = links.slice(0, 50);
      
      await Promise.allSettled(
        linksToCheck.map(async (link) => {
          try {
            const res = await axios.head(link.url, { timeout: 5000, validateStatus: () => true });
            if (res.status >= 400) {
              broken.push({
                url: link.url,
                statusCode: res.status,
                foundOn: [link.foundOn],
                severity: res.status === 404 ? 'High' : 'Medium',
              });
            }
          } catch (err) {
            broken.push({
              url: link.url,
              statusCode: 0,
              foundOn: [link.foundOn],
              severity: 'Critical',
            });
          }
        })
      );

      return broken;
    } catch (error) {
      logger.error('Broken Links Check Error:', error);
      return [];
    }
  }

  /**
   * Check meta tags
   */
  async checkMetaTags(url) {
    try {
      const response = await axios.get(url, { 
        timeout: 30000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0)'
        }
      });
      
      if (response.status >= 400) {
        logger.warn(`Meta tags check skipped for ${url} - Status: ${response.status}`);
        return [];
      }
      
      const $ = cheerio.load(response.data);
      const issues = [];

      const title = $('title').text();
      const description = $('meta[name="description"]').attr('content');

      if (!title || title.length === 0) {
        issues.push({
          url,
          issue: 'Missing title tag',
          type: 'Missing Title',
          severity: 'Critical',
        });
      } else if (title.length > 60) {
        issues.push({
          url,
          issue: `Title too long (${title.length} chars)`,
          type: 'Too Long',
          severity: 'Medium',
        });
      } else if (title.length < 30) {
        issues.push({
          url,
          issue: `Title too short (${title.length} chars)`,
          type: 'Too Short',
          severity: 'Low',
        });
      }

      if (!description) {
        issues.push({
          url,
          issue: 'Missing meta description',
          type: 'Missing Description',
          severity: 'High',
        });
      } else if (description.length > 160) {
        issues.push({
          url,
          issue: `Meta description too long (${description.length} chars)`,
          type: 'Too Long',
          severity: 'Low',
        });
      }

      return issues;
    } catch (error) {
      logger.error('Meta Tags Check Error:', error);
      return [];
    }
  }

  /**
   * Check for missing alt tags
   */
  async checkAltTags(url) {
    try {
      const response = await axios.get(url, { 
        timeout: 30000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0)'
        }
      });
      
      if (response.status >= 400) {
        logger.warn(`Alt tags check skipped for ${url} - Status: ${response.status}`);
        return [];
      }
      
      const $ = cheerio.load(response.data);
      const missing = [];

      $('img').each((i, elem) => {
        const alt = $(elem).attr('alt');
        const src = $(elem).attr('src');
        
        if (!alt || alt.trim() === '') {
          missing.push({
            imageUrl: this.resolveUrl(url, src),
            pageUrl: url,
            severity: 'Medium',
          });
        }
      });

      return missing;
    } catch (error) {
      logger.error('Alt Tags Check Error:', error);
      return [];
    }
  }

  /**
   * Check robots.txt
   */
  async checkRobotsTxt(url) {
    try {
      const robotsUrl = new URL('/robots.txt', url).href;
      const response = await axios.get(robotsUrl, { timeout: 5000, validateStatus: () => true });
      const issues = [];

      if (response.status === 404) {
        issues.push({
          issue: 'robots.txt not found',
          severity: 'Medium',
        });
      } else if (response.status === 200) {
        const content = response.data;
        
        // Check if entire site is blocked (only "Disallow: /" with nothing after the slash)
        // This should NOT match "Disallow: /wp-admin/" or "Disallow: /private/"
        const lines = content.split('\n');
        const hasBlockAll = lines.some(line => {
          const trimmed = line.trim().toLowerCase();
          // Match "disallow: /" but NOT "disallow: /something"
          return trimmed === 'disallow: /' || trimmed === 'disallow:/';
        });
        
        if (hasBlockAll) {
          issues.push({
            issue: 'robots.txt blocking entire site with "Disallow: /"',
            severity: 'Critical',
          });
        }
      }

      return issues;
    } catch (error) {
      logger.error('Robots.txt Check Error:', error);
      return [];
    }
  }

  /**
   * Check sitemap
   */
  async checkSitemap(url) {
    try {
      const issues = [];
      const sitemapPaths = [
        '/sitemap.xml',
        '/sitemap_index.xml',
        '/sitemap-index.xml',
        '/sitemap.php',
      ];

      let sitemapFound = false;

      // Check each common sitemap location
      for (const path of sitemapPaths) {
        try {
          const sitemapUrl = new URL(path, url).href;
          const response = await axios.get(sitemapUrl, { timeout: 5000, validateStatus: () => true });
          
          if (response.status === 200 && response.data) {
            sitemapFound = true;
            break; // Found a sitemap, no need to check others
          }
        } catch (err) {
          // Continue to next sitemap path
        }
      }

      if (!sitemapFound) {
        issues.push({
          issue: 'XML sitemap not found',
          details: 'No XML sitemap detected at common locations (/sitemap.xml, /sitemap_index.xml)',
          severity: 'High',
        });
      }

      return issues;
    } catch (error) {
      logger.error('Sitemap Check Error:', error);
      return [];
    }
  }

  /**
   * Check SSL/HTTPS
   */
  async checkSSL(url) {
    try {
      const issues = [];
      const urlObj = new URL(url);

      if (urlObj.protocol !== 'https:') {
        issues.push({
          url,
          issue: 'Site not using HTTPS',
          severity: 'Critical',
        });
      }

      return issues;
    } catch (error) {
      logger.error('SSL Check Error:', error);
      return [];
    }
  }

  /**
   * Check for schema markup
   */
  async checkSchema(url) {
    try {
      const response = await axios.get(url, { 
        timeout: 30000, // Increased to 30 seconds
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0)'
        }
      });
      
      // If request failed, return empty issues
      if (response.status >= 400) {
        logger.warn(`Schema check skipped for ${url} - Status: ${response.status}`);
        return [];
      }
      
      const $ = cheerio.load(response.data);
      const issues = [];

      const schemas = $('script[type="application/ld+json"]');
      
      if (schemas.length === 0) {
        issues.push({
          url,
          issue: 'No schema markup found',
          type: 'Missing Schema',
          severity: 'Medium',
        });
      }

      return issues;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        logger.warn(`Schema check timeout for ${url} - skipping`);
      } else {
        logger.error('Schema Check Error:', error.message);
      }
      return [];
    }
  }

  /**
   * Calculate overall audit score
   */
  calculateAuditScore(results) {
    let score = 100;
    
    const criticalCount = this.countBySeverity(results, 'Critical');
    const highCount = this.countBySeverity(results, 'High');
    const mediumCount = this.countBySeverity(results, 'Medium');
    const lowCount = this.countBySeverity(results, 'Low');

    // Use a more balanced scoring system
    // Don't let broken links (500 errors) tank the entire score
    score -= Math.min(criticalCount * 2, 20);  // Max 20 points for critical issues
    score -= Math.min(highCount * 0.5, 15);    // Max 15 points for high issues
    score -= Math.min(mediumCount * 0.2, 10);  // Max 10 points for medium issues
    score -= Math.min(lowCount * 0.1, 5);      // Max 5 points for low issues

    return {
      overallScore: Math.max(0, Math.min(100, Math.round(score))),
      totalIssues: criticalCount + highCount + mediumCount + lowCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
    };
  }

  /**
   * Count issues by severity
   */
  countBySeverity(results, severity) {
    let count = 0;
    
    // Count issues from top-level arrays (robotsIssues, sslIssues, sitemapIssues, etc.)
    Object.values(results).forEach(value => {
      if (Array.isArray(value)) {
        count += value.filter(issue => issue.severity === severity).length;
      }
    });
    
    // Count issues from aggregated data (metaAnalysis, headingStructure, imageAnalysis)
    if (results.metaAnalysis && Array.isArray(results.metaAnalysis)) {
      results.metaAnalysis.forEach(page => {
        if (page.issues && Array.isArray(page.issues)) {
          count += page.issues.filter(issue => issue.severity === severity).length;
        }
      });
    }
    
    if (results.headingStructure && Array.isArray(results.headingStructure)) {
      results.headingStructure.forEach(page => {
        if (page.issues && Array.isArray(page.issues)) {
          count += page.issues.filter(issue => issue.severity === severity).length;
        }
      });
    }
    
    if (results.imageAnalysis && Array.isArray(results.imageAnalysis)) {
      results.imageAnalysis.forEach(page => {
        if (page.issues && Array.isArray(page.issues)) {
          count += page.issues.filter(issue => issue.severity === severity).length;
        }
      });
    }
    
    return count;
  }

  /**
   * Helper: Format URL
   */
  formatUrl(domain) {
    if (!domain.startsWith('http')) {
      return `https://${domain}`;
    }
    return domain;
  }

  /**
   * Helper: Resolve relative URLs
   */
  resolveUrl(baseUrl, relativeUrl) {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return relativeUrl;
    }
  }
}

module.exports = new AuditService();
