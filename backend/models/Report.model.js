const mongoose = require('mongoose');

/**
 * @typedef {Object} Report
 * @property {ObjectId} clientId - Reference to Client
 * @property {string} reportType - Type of report
 * @property {string} period - Reporting period
 * @property {Object} data - Report data and metrics
 * @property {Date} createdAt
 */

const reportSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  reportType: {
    type: String,
    enum: ['Weekly', 'Monthly', 'Quarterly', 'Custom', 'Executive Summary'],
    required: true,
  },
  period: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  data: {
    // Keyword Performance
    keywordMetrics: {
      totalKeywords: Number,
      averageRank: Number,
      rankImprovements: Number,
      rankDeclines: Number,
      topKeywords: [{
        keyword: String,
        rank: Number,
        change: Number,
      }],
    },
    
    // Traffic Metrics (if GSC integrated)
    trafficMetrics: {
      totalClicks: Number,
      totalImpressions: Number,
      averageCTR: Number,
      averagePosition: Number,
      changeFromPrevious: {
        clicks: Number,
        impressions: Number,
        ctr: Number,
        position: Number,
      },
    },
    
    // Task Completion
    taskMetrics: {
      totalTasks: Number,
      completedTasks: Number,
      pendingTasks: Number,
      overdueTask: Number,
      completionRate: Number,
    },
    
    // SEO Health
    healthMetrics: {
      currentScore: Number,
      previousScore: Number,
      issuesFixed: Number,
      newIssues: Number,
      criticalIssues: Number,
    },
    
    // Backlinks
    backlinkMetrics: {
      totalBacklinks: Number,
      newBacklinks: Number,
      lostBacklinks: Number,
      dofollowCount: Number,
      nofollowCount: Number,
    },
    
    // Content
    contentMetrics: {
      pagesOptimized: Number,
      metaUpdated: Number,
      schemaAdded: Number,
    },
  },
  
  aiSummary: {
    highlights: [String],
    concerns: [String],
    recommendations: [String],
    nextSteps: [String],
    generatedAt: Date,
  },
  
  fileUrl: {
    type: String, // PDF/Excel file URL
  },
  
  generatedBy: {
    type: String,
    enum: ['Automated', 'Manual'],
    default: 'Automated',
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  sentTo: [{
    email: String,
    sentAt: Date,
  }],
}, {
  timestamps: true,
});

// Indexes
reportSchema.index({ clientId: 1, createdAt: -1 });
reportSchema.index({ reportType: 1, 'period.startDate': 1 });

module.exports = mongoose.model('Report', reportSchema);
