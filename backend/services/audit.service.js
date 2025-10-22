const axios = require('axios');
const cheerio = require('cheerio');
const { logger } = require('../utils/logger');

/**
 * Site Audit Service - Crawls and analyzes websites for SEO issues
 */
class AuditService {
  /**
   * Perform full site audit
   * @param {string} domain - Domain to audit
   * @returns {Promise<Object>} Audit results
   */
  async performFullAudit(domain) {
    try {
      const baseUrl = this.formatUrl(domain);
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
      };

      // Step 1: Discover all pages from the website
      console.log('🚀 Step 1: Starting page discovery...');
      const discoveredPages = await this.discoverPages(baseUrl);
      results.discoveredPages = discoveredPages;
      console.log('📋 Step 1 completed. Pages discovered:', discoveredPages.length);
      
      // Step 2: Analyze each discovered page
      console.log('🔍 Step 2: Starting page analysis...');
      const pageAnalysisPromises = discoveredPages.slice(0, 10).map(page => // Limit to 10 pages for performance
        this.analyzePageSEO(page.url, baseUrl)
      );
      
      const pageAnalyses = await Promise.allSettled(pageAnalysisPromises);
      results.pageAnalysis = pageAnalyses
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      console.log('📊 Step 2 completed. Page analyses:', results.pageAnalysis.length);

      // Step 3: Run all other audit checks in parallel
      console.log('⚙️ Step 3: Running additional audit checks...');
      await Promise.allSettled([
        this.checkBrokenLinks(baseUrl).then(data => results.brokenLinks = data),
        this.checkMetaTags(baseUrl).then(data => results.metaIssues = data),
        this.checkAltTags(baseUrl).then(data => results.missingAltTags = data),
        this.checkRobotsTxt(baseUrl).then(data => results.robotsTxtIssues = data),
        this.checkSitemap(baseUrl).then(data => results.sitemapIssues = data),
        this.checkSSL(baseUrl).then(data => results.sslIssues = data),
        this.checkSchema(baseUrl).then(data => results.schemaIssues = data),
        this.analyzeCoreWebVitals(baseUrl).then(data => results.coreWebVitals = data),
      ]);

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
   * Discover pages from website
   */
  async discoverPages(baseUrl) {
    try {
      console.log('🔍 Starting page discovery for:', baseUrl);
      const discoveredPages = [];
      const visited = new Set();
      const toVisit = [baseUrl];
      
      // Limit to prevent infinite crawling
      const maxPages = 20;
      
      while (toVisit.length > 0 && discoveredPages.length < maxPages) {
        const currentUrl = toVisit.shift();
        
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);
        
        try {
          console.log('📄 Analyzing page:', currentUrl);
          const response = await axios.get(currentUrl, { 
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0)'
            }
          });
          
          const $ = cheerio.load(response.data);
          const title = $('title').text().trim();
          const metaDescription = $('meta[name="description"]').attr('content') || '';
          
          const pageData = {
            url: currentUrl,
            title: title,
            metaDescription: metaDescription,
            statusCode: response.status,
            contentLength: response.data.length,
            discoveredAt: new Date()
          };
          
          discoveredPages.push(pageData);
          console.log('✅ Page discovered:', pageData.url, 'Title:', pageData.title);
          
          // Find internal links to crawl
          $('a[href]').each((i, element) => {
            const href = $(element).attr('href');
            if (href) {
              const absoluteUrl = this.resolveUrl(baseUrl, href);
              try {
                const urlObj = new URL(absoluteUrl);
                const baseUrlObj = new URL(baseUrl);
                
                // Only crawl same domain, avoid fragments and common files
                if (urlObj.hostname === baseUrlObj.hostname && 
                    !absoluteUrl.includes('#') &&
                    !absoluteUrl.match(/\.(pdf|jpg|jpeg|png|gif|css|js|zip)$/i) &&
                    !visited.has(absoluteUrl) &&
                    toVisit.length < 50) {
                  toVisit.push(absoluteUrl);
                }
              } catch (urlError) {
                // Invalid URL, skip
              }
            }
          });
          
        } catch (error) {
          // Skip pages that can't be accessed
          console.warn(`⚠️ Could not access page: ${currentUrl}`, error.message);
        }
      }
      
      console.log('🎉 Page discovery completed. Found', discoveredPages.length, 'pages');
      return discoveredPages;
    } catch (error) {
      console.error('❌ Page discovery error:', error);
      return [];
    }
  }

  /**
   * Analyze individual page for SEO
   */
  async analyzePageSEO(url, baseUrl) {
    try {
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0)'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Meta Information
      const title = $('title').text().trim();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
      const canonical = $('link[rel="canonical"]').attr('href') || '';
      const robots = $('meta[name="robots"]').attr('content') || '';
      
      // Open Graph Tags
      const ogTitle = $('meta[property="og:title"]').attr('content') || '';
      const ogDescription = $('meta[property="og:description"]').attr('content') || '';
      const ogImage = $('meta[property="og:image"]').attr('content') || '';
      const ogUrl = $('meta[property="og:url"]').attr('content') || '';
      
      // Twitter Card Tags
      const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';
      const twitterTitle = $('meta[name="twitter:title"]').attr('content') || '';
      const twitterDescription = $('meta[name="twitter:description"]').attr('content') || '';
      const twitterImage = $('meta[name="twitter:image"]').attr('content') || '';
      
      // Heading Structure
      const headings = [];
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        $(tag).each((i, element) => {
          headings.push({
            tag: tag.toUpperCase(),
            text: $(element).text().trim(),
            level: parseInt(tag.substring(1))
          });
        });
      });
      
      // Images Analysis
      const images = [];
      $('img').each((i, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        const title = $(element).attr('title') || '';
        
        images.push({
          src: src ? this.resolveUrl(baseUrl, src) : '',
          alt: alt,
          title: title,
          hasAlt: !!alt,
          altLength: alt.length
        });
      });
      
      // Links Analysis
      const internalLinks = [];
      const externalLinks = [];
      
      $('a[href]').each((i, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        const title = $(element).attr('title') || '';
        
        if (href) {
          const absoluteUrl = this.resolveUrl(baseUrl, href);
          const urlObj = new URL(absoluteUrl);
          const baseUrlObj = new URL(baseUrl);
          
          const linkData = {
            href: absoluteUrl,
            text: text,
            title: title,
            isNofollow: $(element).attr('rel')?.includes('nofollow') || false
          };
          
          if (urlObj.hostname === baseUrlObj.hostname) {
            internalLinks.push(linkData);
          } else {
            externalLinks.push(linkData);
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
      
      // Content Analysis
      const textContent = $('body').text().replace(/\s+/g, ' ').trim();
      const wordCount = textContent.split(' ').length;
      
      return {
        url: url,
        statusCode: response.status,
        loadTime: response.headers['x-response-time'] || null,
        
        // Meta Data
        metaData: {
          title: {
            text: title,
            length: title.length,
            isEmpty: !title,
            isTooShort: title.length < 30,
            isTooLong: title.length > 60
          },
          description: {
            text: metaDescription,
            length: metaDescription.length,
            isEmpty: !metaDescription,
            isTooShort: metaDescription.length < 120,
            isTooLong: metaDescription.length > 160
          },
          keywords: metaKeywords,
          canonical: canonical,
          robots: robots
        },
        
        // Social Media Tags
        socialTags: {
          openGraph: {
            title: ogTitle,
            description: ogDescription,
            image: ogImage,
            url: ogUrl
          },
          twitter: {
            card: twitterCard,
            title: twitterTitle,
            description: twitterDescription,
            image: twitterImage
          }
        },
        
        // Content Structure
        headings: {
          structure: headings,
          h1Count: headings.filter(h => h.tag === 'H1').length,
          hasH1: headings.some(h => h.tag === 'H1'),
          hasMultipleH1: headings.filter(h => h.tag === 'H1').length > 1
        },
        
        // Images
        images: {
          total: images.length,
          withAlt: images.filter(img => img.hasAlt).length,
          withoutAlt: images.filter(img => !img.hasAlt).length,
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
            details: externalLinks
          }
        },
        
        // Structured Data
        structuredData: structuredData,
        
        // Performance
        performance: {
          cssFiles: cssFiles.length,
          jsFiles: jsFiles.length,
          totalRequests: cssFiles.length + jsFiles.length,
        },
        
        // Content
        content: {
          wordCount: wordCount,
          textLength: textContent.length,
          htmlSize: response.data.length
        },
        
        analyzedAt: new Date()
      };
      
    } catch (error) {
      logger.error(`Error analyzing page ${url}:`, error);
      return {
        url: url,
        error: error.message,
        analyzedAt: new Date()
      };
    }
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
      title: page.metaData?.title,
      description: page.metaData?.description,
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
      const response = await axios.get(url, { timeout: 10000 });
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
      const response = await axios.get(url, { timeout: 10000 });
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
        if (content.toLowerCase().includes('disallow: /')) {
          issues.push({
            issue: 'robots.txt blocking entire site',
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
      const sitemapUrl = new URL('/sitemap.xml', url).href;
      const response = await axios.get(sitemapUrl, { timeout: 5000, validateStatus: () => true });
      const issues = [];

      if (response.status === 404) {
        issues.push({
          issue: 'sitemap.xml not found',
          details: 'No XML sitemap detected',
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
      const response = await axios.get(url, { timeout: 10000 });
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
      logger.error('Schema Check Error:', error);
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

    score -= criticalCount * 10;
    score -= highCount * 5;
    score -= mediumCount * 2;
    score -= lowCount * 0.5;

    return {
      overallScore: Math.max(0, Math.min(100, score)),
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
    Object.values(results).forEach(issueArray => {
      if (Array.isArray(issueArray)) {
        count += issueArray.filter(issue => issue.severity === severity).length;
      }
    });
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
