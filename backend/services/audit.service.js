const axios = require('axios');
const cheerio = require('cheerio');
const { logger } = require('../utils/logger');
const Page = require('../models/Page.model');

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
      console.log('🔍 Step 2: Starting comprehensive page analysis...');
      const pageAnalysisPromises = discoveredPages.slice(0, 100).map(page => // Analyze up to 100 pages
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
   * Persist audited pages into Pages collection with latest snapshot and SEO score
   * @param {Object} auditOrResults - Audit document or audit results object containing results
   * @param {String|Object} clientId - Client ObjectId
   */
  async persistPages(auditOrResults, clientId) {
    try {
      const results = auditOrResults?.results || auditOrResults
      if (!results) return
      const analyses = Array.isArray(results.pageAnalysis) ? results.pageAnalysis : []

      const upserts = analyses.map(async (pa) => {
        try {
          const url = pa.url
          const u = new URL(url)
          const path = (u.pathname || '/').replace(/\/+$/,'') || '/'
          // Use a special slug for the root path to avoid collisions with "/home" pages
          const slug = path === '/' ? '__root__' : path.replace(/^\//,'')

          // Extract fields
          const meta = pa.metaData || {}
          const social = pa.socialTags || {}
          const headings = pa.headings || {}
          const images = pa.images || {}
          const content = pa.content || {}
          const perf = pa.performance || {}
          const title = meta.title?.text || pa.title || u.pathname || 'Untitled'
          const h1 = Array.isArray(headings.h1Text) ? (headings.h1Text[0] || '') : ''
          const metaDescription = meta.description?.text || ''

          const update = {
            clientId,
            url,
            slug,
            title: title?.substring(0, 60) || 'Untitled',
            metaDescription: metaDescription?.substring(0, 160) || '',
            h1,
            seo: {
              canonical: meta.canonical || undefined,
              robots: meta.robots || 'index,follow',
              focusKeyword: undefined,
              readabilityScore: undefined,
              seoScore: pa.seoAnalysis?.seoScore ?? undefined,
            },
            structuredData: {
              type: (pa.structuredData?.types && pa.structuredData.types[0]) || 'WebPage',
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
              sample: content.sampleText || undefined,
            },
            images: (images.details || []).map(img => ({
              url: img.src,
              alt: img.alt || '',
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
  async discoverPages(baseUrl) {
    try {
      console.log('🔍 Starting comprehensive page discovery for:', baseUrl);
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

      // Seed from sitemap.xml if present
      try {
        const sitemapUrl = new URL('/sitemap.xml', baseUrl).href
        const sm = await axios.get(sitemapUrl, { timeout: 8000, validateStatus: () => true })
        if (sm.status === 200 && typeof sm.data === 'string') {
          const locs = Array.from(sm.data.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map(m => m[1])
          locs.slice(0, 150).forEach(href => {
            try {
              const abs = this.resolveUrl(baseUrl, href)
              const host = normalizeHost(new URL(abs).hostname)
              // Filter out editor URLs from sitemap
              const isEditorUrl = abs.match(/[\?&](elementor-preview|wpr_templates|et_fb|fl_builder|vc_editable|tve|ct_builder|brizy-edit|beaver-builder)=/i)
              if ((host === baseHost) && !isEditorUrl && !toVisit.includes(abs)) toVisit.push(abs)
            } catch {}
          })
          console.log(`🗺️ Seeded ${Math.min(150, locs.length)} URLs from sitemap.xml`)
        }
      } catch (e) {
        // Ignore sitemap errors
      }
      
      // Increased limit for more comprehensive crawling
      const maxPages = 200; // Increased to 200 for thorough analysis
      
      while (toVisit.length > 0 && discoveredPages.length < maxPages) {
        const currentUrl = toVisit.shift();
        
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);
        
        try {
          console.log(`📄 Analyzing page ${discoveredPages.length + 1}/${maxPages}:`, currentUrl);
          const response = await axios.get(currentUrl, { 
            timeout: 15000, // Increased timeout
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
            // SEO Quick Checks
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
          
          discoveredPages.push(pageData);
          console.log(`✅ Page ${discoveredPages.length} discovered:`, pageData.url);
          console.log(`   Title: ${pageData.title || '(missing)'}`);
          console.log(`   H1: ${pageData.h1 || '(missing)'}`);
          console.log(`   Word Count: ${wordCount}`);
          console.log(`   Issues: ${pageData.issues.length > 0 ? pageData.issues.join(', ') : 'None'}`);
          
          // One-time sitemap seeding to improve discovery coverage
          if (!sitemapSeeded) {
            sitemapSeeded = true;
            try {
              const smUrl = new URL('/sitemap.xml', baseUrl).href;
              const smRes = await axios.get(smUrl, { timeout: 7000, validateStatus: () => true });
              if (smRes.status === 200) {
                const $$ = cheerio.load(smRes.data, { xmlMode: true });
                const addToQueue = (locUrl) => {
                  try {
                    const u = new URL(locUrl);
                    if (normalizeHost(u.hostname) !== baseHost) return;
                    // Filter out editor URLs
                    const isEditorUrl = locUrl.match(/[\?&](elementor-preview|wpr_templates|et_fb|fl_builder|vc_editable|tve|ct_builder|brizy-edit|beaver-builder)=/i);
                    if (isEditorUrl) return;
                    if (!visited.has(locUrl) && !toVisit.includes(locUrl) && toVisit.length < 200) toVisit.push(locUrl);
                  } catch {}
                };
                // If this is a sitemap index
                const indexLocs = $$('sitemap > loc');
                if (indexLocs.length > 0) {
                  // Fetch a few child sitemaps
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
                  // Simple sitemap with URLs
                  $$('url > loc').each((i, el) => addToQueue($$(el).text().trim()));
                }
                console.log(`🗺️  Sitemap seeding done. Queue size: ${toVisit.length}`);
              }
            } catch (e) {
              // ignore sitemap errors
            }
          }

          // Find internal links to crawl - more aggressive discovery
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
                
                // Only crawl same domain, avoid fragments and common files
                if ((linkHost === baseHostN || linkHost === currentHost) && 
                    !absoluteUrl.includes('#') &&
                    !isEditorUrl &&
                    !isAdminUrl &&
                    !isFeedUrl &&
                    !isFileUrl &&
                    !visited.has(absoluteUrl) &&
                    !toVisit.includes(absoluteUrl) &&
                    toVisit.length < 200) { // Allow larger queue
                  toVisit.push(absoluteUrl);
                }
              } catch (urlError) {
                // Invalid URL, skip
              }
            }
          });
          
        } catch (error) {
          // Skip pages that can't be accessed but log them
          console.warn(`⚠️ Could not access page: ${currentUrl}`, error.message);
          discoveredPages.push({
            url: currentUrl,
            title: 'Error Loading Page',
            statusCode: error.response?.status || 0,
            error: error.message,
            issues: ['Page Load Error'],
            discoveredAt: new Date()
          });
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
  async analyzePageSEO(url, baseUrl) {
    try {
      const response = await axios.get(url, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0; +https://seo-audit.example.com)'
        }
      });
      
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

      // Page responds with redirect?
      let pageRedirects = null;
      try {
        const noRedirect = await axios.get(url, { timeout: 5000, maxRedirects: 0, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0; +https://seo-audit.example.com)'} });
        pageRedirects = (noRedirect.status >= 300 && noRedirect.status < 400) ? true : false;
      } catch (e) {
        pageRedirects = null;
      }

      // Sample a few links for broken status
      const sampleLinks = [...internalLinks.slice(0, 5), ...externalLinks.slice(0, 5)];
      let brokenSampleCount = 0;
      await Promise.allSettled(sampleLinks.map(async (l) => {
        try {
          const head = await axios.head(l.href, { timeout: 5000, validateStatus: () => true });
          if (head.status >= 400) brokenSampleCount += 1;
        } catch (e) {
          brokenSampleCount += 1;
        }
      }));

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
        
        // Content
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
          contentDensity: (wordCount / response.data.length * 100).toFixed(2) + '%'
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
      logger.error(`Error analyzing page ${url}:`, error);
      return {
        url: url,
        error: error.message,
        seoAnalysis: {
          criticalIssues: ['Failed to analyze page: ' + error.message],
          opportunities: [],
          recommendations: []
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
