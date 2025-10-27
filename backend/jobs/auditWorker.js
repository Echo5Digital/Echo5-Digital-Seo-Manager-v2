const auditQueue = require('./auditQueue');
const auditService = require('../services/audit.service');
const Audit = require('../models/Audit.model');
const { logger } = require('../utils/logger');

/**
 * Process audit jobs from the Bull queue
 * Each job analyzes a website and stores results
 */
auditQueue.process(async (job) => {
  const { auditId, clientId, url } = job.data;
  
  try {
    // Format URL to ensure it has protocol
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    logger.info(`Starting audit job ${job.id} for ${formattedUrl}`);
    
    // Update audit status to 'Running'
    await Audit.findByIdAndUpdate(auditId, { status: 'Running' });
    
    // Step 1: Page Discovery (10%)
    job.progress(10);
    await job.progress(10);
    const discoveredPages = await auditService.discoverPages(formattedUrl);
    logger.info(`Discovered ${discoveredPages.length} pages`);
    
    // Update progress: 20%
    await job.progress(20);
    
    // Step 2: Analyze pages in batches (20% - 80%)
    const pagesToAnalyze = discoveredPages.slice(0, 100); // Reduced to 100 pages max
    const batchSize = 10; // Smaller batches - 10 pages at a time
    const allPageAnalyses = [];
    const totalBatches = Math.ceil(pagesToAnalyze.length / batchSize);
    
    for (let i = 0; i < pagesToAnalyze.length; i += batchSize) {
      const batch = pagesToAnalyze.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      logger.info(`Processing batch ${currentBatch}/${totalBatches} (${batch.length} pages)`);
      
      // Analyze batch
      const batchPromises = batch.map(page => 
        auditService.analyzePageSEO(page.url, formattedUrl)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      const successfulResults = batchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      
      allPageAnalyses.push(...successfulResults);
      
      // Update progress (20% to 80% range)
      const progress = 20 + Math.floor((currentBatch / totalBatches) * 60);
      await job.progress(progress);
      
      logger.info(`Batch ${currentBatch}/${totalBatches} completed. Total analyzed: ${allPageAnalyses.length}`);
      
      // Add delay between batches to prevent memory buildup
      if (currentBatch < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
    
    // Step 3: Additional checks (80% - 90%)
    await job.progress(80);
    const results = {
      discoveredPages: discoveredPages,
      pageAnalysis: allPageAnalyses,
      brokenLinks: [],
      metaIssues: [],
      missingAltTags: [],
      robotsTxtIssues: [],
      sitemapIssues: [],
      sslIssues: [],
      schemaIssues: [],
      coreWebVitals: [],
      metaAnalysis: [],
      headingStructure: [],
      imageAnalysis: [],
      linkAnalysis: [],
      contentAnalysis: [],
      duplicateContent: [],
    };
    
    logger.info('Running additional SEO checks...');
    await Promise.allSettled([
      auditService.checkBrokenLinks(formattedUrl).then(data => results.brokenLinks = data),
      auditService.checkMetaTags(formattedUrl).then(data => results.metaIssues = data),
      auditService.checkAltTags(formattedUrl).then(data => results.missingAltTags = data),
      auditService.checkRobotsTxt(formattedUrl).then(data => results.robotsTxtIssues = data),
      auditService.checkSitemap(formattedUrl).then(data => results.sitemapIssues = data),
      auditService.checkSSL(formattedUrl).then(data => results.sslIssues = data),
      auditService.checkSchema(formattedUrl).then(data => results.schemaIssues = data),
      auditService.analyzeCoreWebVitals(formattedUrl).then(data => results.coreWebVitals = data),
    ]);
    
    await job.progress(90);
    
    // Step 4: Aggregate data
    logger.info('Aggregating page data...');
    auditService.aggregatePageData(results);
    
    // Step 5: Calculate score
    const scoreData = auditService.calculateAuditScore(results);
    
    await job.progress(95);
    
    // Step 6: Save audit results
    logger.info('Saving audit results to database...');
    const audit = await Audit.findByIdAndUpdate(
      auditId,
      {
        status: 'Completed',
        results: results,
        overallScore: scoreData.overallScore,
        completedAt: new Date(),
      },
      { new: true }
    );
    
    // Step 7: Persist pages to Pages collection
    logger.info('Persisting pages to database...');
    await auditService.persistPages(results, clientId);
    
    await job.progress(100);
    
    logger.info(`Audit job ${job.id} completed successfully`);
    
    return {
      auditId,
      status: 'Completed',
      pagesAnalyzed: allPageAnalyses.length,
      score: scoreData.overallScore,
    };
    
  } catch (error) {
    logger.error(`Audit job ${job.id} failed:`, error);
    
    // Update audit status to Failed
    await Audit.findByIdAndUpdate(auditId, {
      status: 'Failed',
      error: error.message,
      completedAt: new Date(),
    });
    
    throw error; // Bull will handle retry logic
  }
});

logger.info('Audit worker started and listening for jobs...');

module.exports = auditQueue;
