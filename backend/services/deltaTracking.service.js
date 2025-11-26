/**
 * Delta Tracking Service
 * 
 * Calculates 7-day and 30-day comparisons for all metrics
 * Provides trend analysis and change detection
 */

const DailyMetrics = require('../models/DailyMetrics.model');

class DeltaTrackingService {
  /**
   * Calculate delta between two values
   */
  calculateDelta(current, previous) {
    if (previous === 0 || previous === null || previous === undefined) {
      return {
        value: previous || 0,
        change: current || 0,
        percent: current > 0 ? 100 : 0
      };
    }

    const change = (current || 0) - previous;
    const percent = ((change / previous) * 100);

    return {
      value: previous,
      change: Math.round(change * 100) / 100,
      percent: Math.round(percent * 100) / 100
    };
  }

  /**
   * Determine trend direction
   */
  getTrendDirection(change, isInverseMetric = false) {
    // For inverse metrics like bounce rate or position, lower is better
    if (isInverseMetric) {
      if (change < -5) return 'improved';
      if (change > 5) return 'declined';
      return 'stable';
    }

    if (change > 5) return 'improved';
    if (change < -5) return 'declined';
    return 'stable';
  }

  /**
   * Get metrics from N days ago
   */
  async getMetricsFromDaysAgo(clientId, daysAgo) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return DailyMetrics.findOne({
      client: clientId,
      date: { $gte: targetDate, $lt: nextDay }
    });
  }

  /**
   * Calculate deltas for a single client
   */
  async calculateClientDeltas(clientId) {
    const latestMetrics = await DailyMetrics.getLatestMetrics(clientId);
    if (!latestMetrics) {
      return null;
    }

    const metrics7DaysAgo = await this.getMetricsFromDaysAgo(clientId, 7);
    const metrics30DaysAgo = await this.getMetricsFromDaysAgo(clientId, 30);

    const deltas = {
      day7: this.calculateSourceDeltas(latestMetrics, metrics7DaysAgo),
      day30: this.calculateSourceDeltas(latestMetrics, metrics30DaysAgo)
    };

    // Update the latest metrics with calculated deltas
    latestMetrics.deltas = deltas;
    await latestMetrics.save();

    return deltas;
  }

  /**
   * Calculate deltas for each data source
   */
  calculateSourceDeltas(current, previous) {
    const result = {
      ga4: {},
      gsc: {},
      gbp: {},
      rank: {}
    };

    // GA4 Deltas
    if (current.ga4) {
      result.ga4 = {
        users: this.calculateDelta(current.ga4.users, previous?.ga4?.users),
        sessions: this.calculateDelta(current.ga4.sessions, previous?.ga4?.sessions),
        pageviews: this.calculateDelta(current.ga4.pageviews, previous?.ga4?.pageviews),
        bounceRate: this.calculateDelta(current.ga4.bounceRate, previous?.ga4?.bounceRate)
      };
    }

    // GSC Deltas
    if (current.gsc) {
      result.gsc = {
        clicks: this.calculateDelta(current.gsc.clicks, previous?.gsc?.clicks),
        impressions: this.calculateDelta(current.gsc.impressions, previous?.gsc?.impressions),
        ctr: this.calculateDelta(current.gsc.ctr, previous?.gsc?.ctr),
        position: this.calculateDelta(current.gsc.position, previous?.gsc?.position)
      };
    }

    // GBP Deltas
    if (current.gbp) {
      result.gbp = {
        views: this.calculateDelta(current.gbp.views, previous?.gbp?.views),
        actions: this.calculateDelta(current.gbp.actions, previous?.gbp?.actions)
      };
    }

    // Rank Deltas
    if (current.rank) {
      result.rank = {
        avgPosition: this.calculateDelta(current.rank.avgPosition, previous?.rank?.avgPosition),
        top10Count: this.calculateDelta(current.rank.top10Count, previous?.rank?.top10Count)
      };
    }

    return result;
  }

  /**
   * Get 7-day comparison summary for a client
   */
  async get7DayComparison(clientId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get metrics for both periods
    const currentMetrics = await DailyMetrics.find({
      client: clientId,
      date: { $gte: sevenDaysAgo, $lte: today }
    }).sort({ date: -1 });

    const fourteenDaysAgo = new Date(sevenDaysAgo);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7);

    const previousMetrics = await DailyMetrics.find({
      client: clientId,
      date: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
    });

    // Aggregate metrics
    const current = this.aggregateMetrics(currentMetrics);
    const previous = this.aggregateMetrics(previousMetrics);

    return {
      period: '7 days',
      current,
      previous,
      changes: {
        ga4: {
          users: this.calculateDelta(current.ga4?.users, previous.ga4?.users),
          sessions: this.calculateDelta(current.ga4?.sessions, previous.ga4?.sessions),
          pageviews: this.calculateDelta(current.ga4?.pageviews, previous.ga4?.pageviews)
        },
        gsc: {
          clicks: this.calculateDelta(current.gsc?.clicks, previous.gsc?.clicks),
          impressions: this.calculateDelta(current.gsc?.impressions, previous.gsc?.impressions)
        },
        gbp: {
          views: this.calculateDelta(current.gbp?.views, previous.gbp?.views),
          actions: this.calculateDelta(current.gbp?.actions, previous.gbp?.actions)
        }
      }
    };
  }

  /**
   * Get 30-day comparison summary for a client
   */
  async get30DayComparison(clientId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const currentMetrics = await DailyMetrics.find({
      client: clientId,
      date: { $gte: thirtyDaysAgo, $lte: today }
    });

    const sixtyDaysAgo = new Date(thirtyDaysAgo);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 30);

    const previousMetrics = await DailyMetrics.find({
      client: clientId,
      date: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
    });

    const current = this.aggregateMetrics(currentMetrics);
    const previous = this.aggregateMetrics(previousMetrics);

    return {
      period: '30 days',
      current,
      previous,
      changes: {
        ga4: {
          users: this.calculateDelta(current.ga4?.users, previous.ga4?.users),
          sessions: this.calculateDelta(current.ga4?.sessions, previous.ga4?.sessions),
          pageviews: this.calculateDelta(current.ga4?.pageviews, previous.ga4?.pageviews)
        },
        gsc: {
          clicks: this.calculateDelta(current.gsc?.clicks, previous.gsc?.clicks),
          impressions: this.calculateDelta(current.gsc?.impressions, previous.gsc?.impressions)
        },
        gbp: {
          views: this.calculateDelta(current.gbp?.views, previous.gbp?.views),
          actions: this.calculateDelta(current.gbp?.actions, previous.gbp?.actions)
        }
      }
    };
  }

  /**
   * Aggregate metrics from multiple daily records
   */
  aggregateMetrics(metricsArray) {
    const result = {
      ga4: { users: 0, sessions: 0, pageviews: 0, bounceRate: 0 },
      gsc: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      gbp: { views: 0, actions: 0, calls: 0 }
    };

    let ga4Count = 0;
    let gscCount = 0;
    let gbpCount = 0;

    metricsArray.forEach(m => {
      if (m.ga4?.users) {
        result.ga4.users += m.ga4.users;
        result.ga4.sessions += m.ga4.sessions || 0;
        result.ga4.pageviews += m.ga4.pageviews || 0;
        result.ga4.bounceRate += m.ga4.bounceRate || 0;
        ga4Count++;
      }

      if (m.gsc?.clicks !== undefined) {
        result.gsc.clicks += m.gsc.clicks;
        result.gsc.impressions += m.gsc.impressions || 0;
        result.gsc.ctr += m.gsc.ctr || 0;
        result.gsc.position += m.gsc.position || 0;
        gscCount++;
      }

      if (m.gbp?.views !== undefined) {
        result.gbp.views += m.gbp.views;
        result.gbp.actions += m.gbp.actions || 0;
        result.gbp.calls += m.gbp.calls || 0;
        gbpCount++;
      }
    });

    // Calculate averages for rate metrics
    if (ga4Count > 0) {
      result.ga4.bounceRate = result.ga4.bounceRate / ga4Count;
    }
    if (gscCount > 0) {
      result.gsc.ctr = result.gsc.ctr / gscCount;
      result.gsc.position = result.gsc.position / gscCount;
    }

    return result;
  }

  /**
   * Calculate deltas for all clients
   */
  async calculateAllClientDeltas() {
    const Client = require('../models/Client.model');
    const clients = await Client.find({ isActive: true });

    console.log(`📊 [DeltaTracking] Calculating deltas for ${clients.length} clients...`);

    const results = {
      success: 0,
      failed: 0,
      noData: 0
    };

    for (const client of clients) {
      try {
        const deltas = await this.calculateClientDeltas(client._id);
        if (deltas) {
          results.success++;
        } else {
          results.noData++;
        }
      } catch (error) {
        console.error(`❌ [DeltaTracking] Failed for ${client.name}:`, error.message);
        results.failed++;
      }
    }

    console.log(`✅ [DeltaTracking] Complete: ${results.success} success, ${results.noData} no data, ${results.failed} failed`);
    return results;
  }

  /**
   * Get trend summary for dashboard
   */
  async getTrendSummary(clientId) {
    const day7 = await this.get7DayComparison(clientId);
    const day30 = await this.get30DayComparison(clientId);

    return {
      clientId,
      trends: {
        traffic: {
          direction: this.getTrendDirection(day7.changes.ga4?.users?.percent || 0),
          day7Change: day7.changes.ga4?.users?.percent || 0,
          day30Change: day30.changes.ga4?.users?.percent || 0
        },
        clicks: {
          direction: this.getTrendDirection(day7.changes.gsc?.clicks?.percent || 0),
          day7Change: day7.changes.gsc?.clicks?.percent || 0,
          day30Change: day30.changes.gsc?.clicks?.percent || 0
        },
        impressions: {
          direction: this.getTrendDirection(day7.changes.gsc?.impressions?.percent || 0),
          day7Change: day7.changes.gsc?.impressions?.percent || 0,
          day30Change: day30.changes.gsc?.impressions?.percent || 0
        },
        localVisibility: {
          direction: this.getTrendDirection(day7.changes.gbp?.views?.percent || 0),
          day7Change: day7.changes.gbp?.views?.percent || 0,
          day30Change: day30.changes.gbp?.views?.percent || 0
        }
      }
    };
  }
}

module.exports = new DeltaTrackingService();
