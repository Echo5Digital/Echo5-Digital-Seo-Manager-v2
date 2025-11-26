const mongoose = require('mongoose');

/**
 * DailyMetrics Model
 * 
 * Stores daily snapshots of analytics data from GA4, GSC, and GBP
 * Used for delta tracking (7-day and 30-day comparisons)
 */

const dailyMetricsSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    index: true
  },
  
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  source: {
    type: String,
    enum: ['ga4', 'gsc', 'gbp', 'rank'],
    required: true
  },
  
  // GA4 Metrics
  ga4: {
    users: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    pageviews: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 }, // in seconds
    engagementRate: { type: Number, default: 0 },
    eventsCount: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 }
  },
  
  // GSC Metrics
  gsc: {
    clicks: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
    indexedPages: { type: Number, default: 0 },
    crawlErrors: { type: Number, default: 0 }
  },
  
  // GBP Metrics
  gbp: {
    views: { type: Number, default: 0 },
    searches: { type: Number, default: 0 },
    actions: { type: Number, default: 0 },
    calls: { type: Number, default: 0 },
    directions: { type: Number, default: 0 },
    websiteClicks: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 }
  },
  
  // Rank Tracking Summary
  rank: {
    trackedKeywords: { type: Number, default: 0 },
    avgPosition: { type: Number, default: 0 },
    top3Count: { type: Number, default: 0 },
    top10Count: { type: Number, default: 0 },
    top20Count: { type: Number, default: 0 },
    top100Count: { type: Number, default: 0 },
    notRanking: { type: Number, default: 0 },
    improved: { type: Number, default: 0 },
    declined: { type: Number, default: 0 },
    unchanged: { type: Number, default: 0 }
  },
  
  // Calculated Deltas (populated by deltaTracking service)
  deltas: {
    day7: {
      ga4: {
        users: { value: Number, change: Number, percent: Number },
        sessions: { value: Number, change: Number, percent: Number },
        pageviews: { value: Number, change: Number, percent: Number },
        bounceRate: { value: Number, change: Number, percent: Number }
      },
      gsc: {
        clicks: { value: Number, change: Number, percent: Number },
        impressions: { value: Number, change: Number, percent: Number },
        ctr: { value: Number, change: Number, percent: Number },
        position: { value: Number, change: Number, percent: Number }
      },
      gbp: {
        views: { value: Number, change: Number, percent: Number },
        actions: { value: Number, change: Number, percent: Number }
      },
      rank: {
        avgPosition: { value: Number, change: Number, percent: Number },
        top10Count: { value: Number, change: Number, percent: Number }
      }
    },
    day30: {
      ga4: {
        users: { value: Number, change: Number, percent: Number },
        sessions: { value: Number, change: Number, percent: Number },
        pageviews: { value: Number, change: Number, percent: Number },
        bounceRate: { value: Number, change: Number, percent: Number }
      },
      gsc: {
        clicks: { value: Number, change: Number, percent: Number },
        impressions: { value: Number, change: Number, percent: Number },
        ctr: { value: Number, change: Number, percent: Number },
        position: { value: Number, change: Number, percent: Number }
      },
      gbp: {
        views: { value: Number, change: Number, percent: Number },
        actions: { value: Number, change: Number, percent: Number }
      },
      rank: {
        avgPosition: { value: Number, change: Number, percent: Number },
        top10Count: { value: Number, change: Number, percent: Number }
      }
    }
  },
  
  // Sync metadata
  syncStatus: {
    type: String,
    enum: ['pending', 'success', 'partial', 'failed'],
    default: 'pending'
  },
  
  syncErrors: [{
    source: String,
    message: String,
    timestamp: Date
  }],
  
  syncDuration: Number // milliseconds
  
}, {
  timestamps: true
});

// Compound index for efficient queries
dailyMetricsSchema.index({ client: 1, date: -1, source: 1 });
dailyMetricsSchema.index({ date: -1 });

// Static method to get metrics for a date range
dailyMetricsSchema.statics.getClientMetrics = async function(clientId, startDate, endDate, source = null) {
  const query = {
    client: clientId,
    date: { $gte: startDate, $lte: endDate }
  };
  
  if (source) {
    query.source = source;
  }
  
  return this.find(query).sort({ date: -1 });
};

// Static method to get latest metrics for a client
dailyMetricsSchema.statics.getLatestMetrics = async function(clientId) {
  return this.findOne({ client: clientId })
    .sort({ date: -1 })
    .exec();
};

// Static method to check if metrics exist for a date
dailyMetricsSchema.statics.hasMetricsForDate = async function(clientId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const count = await this.countDocuments({
    client: clientId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });
  
  return count > 0;
};

module.exports = mongoose.model('DailyMetrics', dailyMetricsSchema);
