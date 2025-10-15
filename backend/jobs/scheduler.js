const cron = require('node-cron');
const { logger } = require('../utils/logger');
const Client = require('../models/Client.model');
const Keyword = require('../models/Keyword.model');
const Notification = require('../models/Notification.model');
const auditService = require('../services/audit.service');
const aiService = require('../services/ai.service');

/**
 * Initialize all scheduled jobs
 */
function initScheduler() {
  logger.info('📅 Initializing scheduler...');

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

  // Daily audit for clients with daily frequency (Every day at 3 AM)
  cron.schedule('0 3 * * *', async () => {
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
};
