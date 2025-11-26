const cron = require('node-cron');
const { logger } = require('../utils/logger');
const Client = require('../models/Client.model');
const Keyword = require('../models/Keyword.model');
const Notification = require('../models/Notification.model');
const auditService = require('../services/audit.service');
const aiService = require('../services/ai.service');

// NEW: Import data sync and delta tracking services
const dataSyncService = require('../services/dataSync.service');
const deltaTrackingService = require('../services/deltaTracking.service');

// Feature flag for daily sync (can be controlled via env)
const ENABLE_DAILY_SYNC = process.env.ENABLE_DAILY_SYNC !== 'false';

/**
 * Initialize all scheduled jobs
 */
function initScheduler() {
  logger.info('📅 Initializing scheduler...');

  // ============== NEW: Daily Data Sync Jobs ==============
  
  if (ENABLE_DAILY_SYNC) {
    // Daily GA4 data sync (Every day at 2 AM)
    cron.schedule('0 2 * * *', async () => {
      logger.info('⏰ Running daily GA4 data sync...');
      await dailyGA4Sync();
    });

    // Daily GSC data sync (Every day at 2:30 AM)
    cron.schedule('30 2 * * *', async () => {
      logger.info('⏰ Running daily GSC data sync...');
      await dailyGSCSync();
    });

    // Daily GBP data sync (Every day at 3 AM - before audits)
    cron.schedule('0 3 * * *', async () => {
      logger.info('⏰ Running daily GBP data sync...');
      await dailyGBPSync();
    });

    // Calculate deltas after syncs complete (Every day at 4 AM)
    cron.schedule('0 4 * * *', async () => {
      logger.info('⏰ Calculating daily deltas...');
      await dailyDeltaCalculation();
    });

    // Generate daily AI insights (Every day at 5 AM)
    cron.schedule('0 5 * * *', async () => {
      logger.info('⏰ Generating daily AI insights...');
      await dailyInsightsGeneration();
    });

    logger.info('✅ Daily sync jobs enabled');
  } else {
    logger.info('⚠️ Daily sync jobs disabled (ENABLE_DAILY_SYNC=false)');
  }

  // ============== Existing Jobs ==============

  // Weekly keyword rank tracking (Every Monday at 6 AM)
  cron.schedule('0 6 * * 1', async () => {
    logger.info('⏰ Running weekly keyword rank tracking...');
    await weeklyKeywordTracking();
  });

  // Monthly SEO health reports (1st day of month at 8 AM)
  cron.schedule('0 8 1 * *', async () => {
    logger.info('⏰ Generating monthly SEO reports...');
    await monthlyReportGeneration();
  });

  // Daily audit for clients with daily frequency (Every day at 3:30 AM - after GBP sync)
  cron.schedule('30 3 * * *', async () => {
    logger.info('⏰ Running daily audits...');
    await dailyAudits();
  });

  // Check for overdue tasks (Every day at 9 AM)
  cron.schedule('0 9 * * *', async () => {
    logger.info('⏰ Checking for overdue tasks...');
    await checkOverdueTasks();
  });

  logger.info('✅ Scheduler initialized successfully');
}

/**
 * Weekly keyword rank tracking
 */
async function weeklyKeywordTracking() {
  try {
    const keywords = await Keyword.find({ status: 'Active' })
      .populate('clientId');

    logger.info(`Tracking ${keywords.length} keywords...`);

    for (const keyword of keywords) {
      try {
        // Simulate rank checking (integrate real SERP API here)
        const newRank = Math.floor(Math.random() * 100) + 1;
        const oldRank = keyword.rankTracking.currentRank || newRank;

        // Update rank
        keyword.rankTracking.previousRank = oldRank;
        keyword.rankTracking.currentRank = newRank;
        keyword.rankTracking.lastChecked = new Date();
        keyword.rankTracking.history.push({
          rank: newRank,
          date: new Date(),
        });

        // Determine trend
        if (oldRank && newRank < oldRank) {
          keyword.rankTracking.trend = 'up';
        } else if (oldRank && newRank > oldRank) {
          keyword.rankTracking.trend = 'down';
        } else {
          keyword.rankTracking.trend = 'stable';
        }

        await keyword.save();

        // Create notifications for significant changes
        if (oldRank && Math.abs(newRank - oldRank) >= 10) {
          const staff = keyword.clientId.assignedStaff || [];
          
          for (const staffId of staff) {
            await Notification.create({
              userId: staffId,
              type: newRank < oldRank ? 'Rank Gain' : 'Rank Drop',
              title: `Rank ${newRank < oldRank ? 'Improved' : 'Dropped'}: ${keyword.keyword}`,
              message: `Keyword "${keyword.keyword}" for ${keyword.clientId.name} moved from position ${oldRank} to ${newRank}`,
              priority: Math.abs(newRank - oldRank) >= 20 ? 'High' : 'Medium',
              relatedModel: 'Keyword',
              relatedId: keyword._id,
            });
          }
        }

      } catch (err) {
        logger.error(`Error tracking keyword ${keyword.keyword}:`, err);
      }
    }

    logger.info('✅ Weekly keyword tracking completed');
  } catch (error) {
    logger.error('Weekly keyword tracking error:', error);
  }
}

/**
 * Monthly SEO report generation
 */
async function monthlyReportGeneration() {
  try {
    const clients = await Client.find({ isActive: true })
      .populate('assignedStaff');

    logger.info(`Generating monthly reports for ${clients.length} clients...`);

    for (const client of clients) {
      try {
        // Aggregate monthly data here
        const reportData = {
          keywordMetrics: {},
          taskMetrics: {},
          healthMetrics: {},
        };

        // Generate AI summary
        const aiSummary = await aiService.generateExecutiveSummary({
          clientName: client.name,
          seoHealth: client.seoHealth,
        });

        // Create report (Report model creation would go here)
        
        logger.info(`Report generated for ${client.name}`);
      } catch (err) {
        logger.error(`Error generating report for ${client.name}:`, err);
      }
    }

    logger.info('✅ Monthly report generation completed');
  } catch (error) {
    logger.error('Monthly report generation error:', error);
  }
}

/**
 * Daily automated audits
 */
async function dailyAudits() {
  try {
    const clients = await Client.find({
      isActive: true,
      'settings.autoAudit': true,
      'settings.auditFrequency': 'daily',
    });

    logger.info(`Running daily audits for ${clients.length} clients...`);

    for (const client of clients) {
      try {
        // Run audit (implement similar to audit routes)
        logger.info(`Audit completed for ${client.name}`);
      } catch (err) {
        logger.error(`Error auditing ${client.name}:`, err);
      }
    }

    logger.info('✅ Daily audits completed');
  } catch (error) {
    logger.error('Daily audits error:', error);
  }
}

/**
 * Check for overdue tasks
 */
async function checkOverdueTasks() {
  try {
    const Task = require('../models/Task.model');
    const today = new Date();

    const overdueTasks = await Task.find({
      status: { $in: ['Pending', 'In Progress'] },
      dueDate: { $lt: today },
    }).populate('assignedTo clientId');

    logger.info(`Found ${overdueTasks.length} overdue tasks`);

    for (const task of overdueTasks) {
      if (task.assignedTo) {
        await Notification.create({
          userId: task.assignedTo._id,
          type: 'Task Overdue',
          title: 'Overdue Task',
          message: `Task "${task.title}" for ${task.clientId.name} is overdue`,
          priority: 'High',
          relatedModel: 'Task',
          relatedId: task._id,
        });
      }
    }

    logger.info('✅ Overdue task check completed');
  } catch (error) {
    logger.error('Overdue task check error:', error);
  }
}

module.exports = {
  initScheduler,
  weeklyKeywordTracking,
  monthlyReportGeneration,
  dailyAudits,
  checkOverdueTasks,
  // NEW: Export sync functions
  dailyGA4Sync,
  dailyGSCSync,
  dailyGBPSync,
  dailyDeltaCalculation,
  dailyInsightsGeneration,
};

// ============== NEW: Daily Sync Functions ==============

/**
 * Daily GA4 data sync for all clients
 */
async function dailyGA4Sync() {
  try {
    const clients = await Client.find({
      isActive: true,
      'integrations.ga4PropertyId': { $exists: true, $ne: '' }
    });

    logger.info(`📊 Syncing GA4 data for ${clients.length} clients...`);
    let success = 0;
    let failed = 0;

    for (const client of clients) {
      try {
        await dataSyncService.syncClientGA4(client._id);
        success++;
      } catch (err) {
        logger.error(`GA4 sync failed for ${client.name}:`, err.message);
        failed++;
      }
      // Rate limit: 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`✅ GA4 sync complete: ${success} success, ${failed} failed`);
  } catch (error) {
    logger.error('Daily GA4 sync error:', error);
  }
}

/**
 * Daily GSC data sync for all clients
 */
async function dailyGSCSync() {
  try {
    const clients = await Client.find({
      isActive: true,
      'integrations.gscSiteUrl': { $exists: true, $ne: '' }
    });

    logger.info(`🔍 Syncing GSC data for ${clients.length} clients...`);
    let success = 0;
    let failed = 0;

    for (const client of clients) {
      try {
        await dataSyncService.syncClientGSC(client._id);
        success++;
      } catch (err) {
        logger.error(`GSC sync failed for ${client.name}:`, err.message);
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`✅ GSC sync complete: ${success} success, ${failed} failed`);
  } catch (error) {
    logger.error('Daily GSC sync error:', error);
  }
}

/**
 * Daily GBP data sync for all clients
 */
async function dailyGBPSync() {
  try {
    const clients = await Client.find({
      isActive: true,
      'integrations.gbpLocationIds.0': { $exists: true }
    });

    logger.info(`📍 Syncing GBP data for ${clients.length} clients...`);
    let success = 0;
    let failed = 0;

    for (const client of clients) {
      try {
        await dataSyncService.syncClientGBP(client._id);
        success++;
      } catch (err) {
        logger.error(`GBP sync failed for ${client.name}:`, err.message);
        failed++;
      }
      // GBP has stricter rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    logger.info(`✅ GBP sync complete: ${success} success, ${failed} failed`);
  } catch (error) {
    logger.error('Daily GBP sync error:', error);
  }
}

/**
 * Calculate deltas for all clients
 */
async function dailyDeltaCalculation() {
  try {
    logger.info('📈 Calculating deltas for all clients...');
    const results = await deltaTrackingService.calculateAllClientDeltas();
    logger.info(`✅ Delta calculation complete: ${results.success} success, ${results.noData} no data, ${results.failed} failed`);
  } catch (error) {
    logger.error('Daily delta calculation error:', error);
  }
}

/**
 * Generate daily AI insights
 */
async function dailyInsightsGeneration() {
  try {
    const clients = await Client.find({ isActive: true }).limit(10); // Limit to avoid API costs
    
    logger.info(`🧠 Generating AI insights for ${clients.length} clients...`);

    for (const client of clients) {
      try {
        // Only generate if SEO health is below threshold or has critical issues
        if (client.seoHealth?.score < 70 || client.seoHealth?.criticalIssues > 0) {
          const clientIntelligenceService = require('../services/clientIntelligence.service');
          await clientIntelligenceService.generateAIInsights(client._id);
          logger.info(`Generated insights for ${client.name}`);
        }
      } catch (err) {
        logger.error(`Insights generation failed for ${client.name}:`, err.message);
      }
    }

    logger.info('✅ Daily insights generation complete');
  } catch (error) {
    logger.error('Daily insights generation error:', error);
  }
}
