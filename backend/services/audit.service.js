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
      };

      // Run all audit checks in parallel
      await Promise.allSettled([
        this.checkBrokenLinks(baseUrl).then(data => results.brokenLinks = data),
        this.checkMetaTags(baseUrl).then(data => results.metaIssues = data),
        this.checkAltTags(baseUrl).then(data => results.missingAltTags = data),
        this.checkRobotsTxt(baseUrl).then(data => results.robotsTxtIssues = data),
        this.checkSitemap(baseUrl).then(data => results.sitemapIssues = data),
        this.checkSSL(baseUrl).then(data => results.sslIssues = data),
        this.checkSchema(baseUrl).then(data => results.schemaIssues = data),
      ]);

      return results;
    } catch (error) {
      logger.error('Audit Error:', error);
      throw error;
    }
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
   * Discover pages from sitemap and internal links
   */
  async discoverPages(domain, maxPages = 10) {
    try {
      const baseUrl = this.formatUrl(domain);
      const discoveredPages = new Set([baseUrl]);
      
      // Try to get pages from sitemap first
      try {
        const sitemapUrls = await this.getPagesFromSitemap(baseUrl);
        sitemapUrls.slice(0, maxPages).forEach(url => discoveredPages.add(url));
      } catch (error) {
        logger.warn('Could not fetch sitemap pages:', error.message);
      }

      // If we don't have enough pages, crawl internal links from homepage
      if (discoveredPages.size < maxPages) {
        try {
          const internalLinks = await this.getInternalLinksFromPage(baseUrl, baseUrl);
          internalLinks.slice(0, maxPages - discoveredPages.size).forEach(url => discoveredPages.add(url));
        } catch (error) {
          logger.warn('Could not fetch internal links:', error.message);
        }
      }

      return Array.from(discoveredPages).slice(0, maxPages);
    } catch (error) {
      logger.error('Error discovering pages:', error);
      return [this.formatUrl(domain)]; // Return at least the homepage
    }
  }

  /**
   * Get pages from sitemap.xml
   */
  async getPagesFromSitemap(baseUrl) {
    try {
      const sitemapUrl = `${baseUrl}/sitemap.xml`;
      const response = await axios.get(sitemapUrl, { timeout: 10000 });
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      const urls = [];
      $('url > loc').each((i, elem) => {
        const url = $(elem).text().trim();
        if (url && url.startsWith('http')) {
          urls.push(url);
        }
      });
      
      return urls;
    } catch (error) {
      throw new Error('Sitemap not accessible');
    }
  }

  /**
   * Get internal links from a page
   */
  async getInternalLinksFromPage(pageUrl, baseUrl) {
    try {
      const response = await axios.get(pageUrl, { timeout: 10000 });
      const $ = cheerio.load(response.data);
      const baseDomain = new URL(baseUrl).hostname;
      const links = new Set();

      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) {
          try {
            const fullUrl = this.resolveUrl(baseUrl, href);
            const linkDomain = new URL(fullUrl).hostname;
            
            // Only include internal links
            if (linkDomain === baseDomain && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
              links.add(fullUrl);
            }
          } catch (error) {
            // Invalid URL, skip
          }
        }
      });

      return Array.from(links);
    } catch (error) {
      throw new Error('Could not fetch internal links');
    }
  }

  /**
   * Analyze individual page for detailed SEO data
   */
  async analyzePageDetails(url) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const $ = cheerio.load(response.data);
      
      const pageData = {
        url,
        title: $('title').text().trim() || '',
        metaDescription: $('meta[name="description"]').attr('content') || '',
        metaKeywords: $('meta[name="keywords"]').attr('content') || '',
        h1: $('h1').map((i, el) => $(el).text().trim()).get(),
        h2: $('h2').map((i, el) => $(el).text().trim()).get(),
        h3: $('h3').map((i, el) => $(el).text().trim()).get(),
        images: $('img').map((i, el) => ({
          src: $(el).attr('src'),
          alt: $(el).attr('alt') || '',
          title: $(el).attr('title') || ''
        })).get(),
        wordCount: $('body').text().replace(/\s+/g, ' ').split(' ').length,
        internalLinks: $('a[href]').length,
        externalLinks: 0, // Will calculate below
        canonicalUrl: $('link[rel="canonical"]').attr('href') || '',
        robotsMeta: $('meta[name="robots"]').attr('content') || '',
        ogTitle: $('meta[property="og:title"]').attr('content') || '',
        ogDescription: $('meta[property="og:description"]').attr('content') || '',
        ogImage: $('meta[property="og:image"]').attr('content') || '',
        twitterCard: $('meta[name="twitter:card"]').attr('content') || '',
        schema: $('script[type="application/ld+json"]').map((i, el) => {
          try {
            return JSON.parse($(el).text());
          } catch {
            return null;
          }
        }).get().filter(Boolean),
        responseTime: Date.now(), // Will calculate actual response time
        statusCode: response.status,
        contentType: response.headers['content-type'] || '',
        lastModified: response.headers['last-modified'] || '',
        contentLength: response.headers['content-length'] || 0
      };

      // Calculate external links
      const baseDomain = new URL(url).hostname;
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && href.startsWith('http')) {
          try {
            const linkDomain = new URL(href).hostname;
            if (linkDomain !== baseDomain) {
              pageData.externalLinks++;
            }
          } catch (error) {
            // Invalid URL, skip
          }
        }
      });

      return pageData;
    } catch (error) {
      logger.error(`Error analyzing page ${url}:`, error);
      return {
        url,
        error: error.message,
        statusCode: error.response?.status || 0
      };
    }
  }

  /**
   * Enhanced audit with detailed page analysis
   */
  async performEnhancedAudit(domain) {
    try {
      const baseUrl = this.formatUrl(domain);
      
      // Discover multiple pages to analyze
      const discoveredPages = await this.discoverPages(domain, 10);
      logger.info(`Discovered ${discoveredPages.length} pages for analysis`);

      // Perform detailed analysis on each page
      const pageAnalyses = await Promise.allSettled(
        discoveredPages.map(pageUrl => this.analyzePageDetails(pageUrl))
      );

      const pages = pageAnalyses.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return { error: result.reason.message };
        }
      });

      // Get the regular audit results
      const regularAudit = await this.performFullAudit(domain);

      // Combine everything
      return {
        ...regularAudit,
        pages: pages,
        summary: {
          totalPages: pages.length,
          pagesAnalyzed: pages.filter(p => !p.error).length,
          averageWordCount: pages.filter(p => p.wordCount).reduce((sum, p) => sum + p.wordCount, 0) / pages.filter(p => p.wordCount).length || 0,
          pagesWithMissingTitle: pages.filter(p => !p.title).length,
          pagesWithMissingDescription: pages.filter(p => !p.metaDescription).length,
          pagesWithMissingH1: pages.filter(p => p.h1 && p.h1.length === 0).length,
          totalImages: pages.reduce((sum, p) => sum + (p.images?.length || 0), 0),
          imagesWithoutAlt: pages.reduce((sum, p) => sum + (p.images?.filter(img => !img.alt).length || 0), 0),
          avgResponseTime: pages.filter(p => p.responseTime).reduce((sum, p) => sum + p.responseTime, 0) / pages.filter(p => p.responseTime).length || 0
        }
      };
    } catch (error) {
      logger.error('Enhanced audit error:', error);
      // Fallback to regular audit
      return await this.performFullAudit(domain);
    }
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
