/**
 * Data Sync Service
 * 
 * Handles automated daily synchronization of analytics data from GA4, GSC, and GBP
 * Stores snapshots in DailyMetrics collection for delta tracking
 */

const DailyMetrics = require('../models/DailyMetrics.model');
const Client = require('../models/Client.model');
const ga4Service = require('./google/ga4.service');
const gscService = require('./google/gsc.service');
const gbpService = require('./google/gbp.service');

class DataSyncService {
  constructor() {
    this.syncInProgress = false;
  }

  /**
   * Sync GA4 data for a single client
   */
  async syncClientGA4(clientId) {
    const client = await Client.findById(clientId);
    if (!client || !client.integrations?.ga4PropertyId) {
      console.log(`⚠️ [DataSync] Client ${clientId} has no GA4 property configured`);
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      console.log(`📊 [DataSync] Syncing GA4 for: ${client.name}`);
      
      // Get yesterday's data (GA4 has 24-48hr delay)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const startDate = yesterday.toISOString().split('T')[0].replace(/-/g, '');
      const endDate = startDate;

      const ga4Data = await ga4Service.getTrafficOverview(
        client.integrations.ga4PropertyId,
        startDate,
        endDate
      );

      // Create or update daily metrics
      const metrics = await DailyMetrics.findOneAndUpdate(
        { 
          client: clientId, 
          date: yesterday,
          source: 'ga4'
        },
        {
          client: clientId,
          date: yesterday,
          source: 'ga4',
          ga4: {
            users: ga4Data.users || 0,
            newUsers: ga4Data.newUsers || 0,
            sessions: ga4Data.sessions || 0,
            pageviews: ga4Data.pageviews || 0,
            bounceRate: ga4Data.bounceRate || 0,
            avgSessionDuration: ga4Data.avgSessionDuration || 0,
            engagementRate: ga4Data.engagementRate || 0
          },
          syncStatus: 'success'
        },
        { upsert: true, new: true }
      );

      console.log(`✅ [DataSync] GA4 synced for ${client.name}: ${ga4Data.users} users`);
      return metrics;

    } catch (error) {
      console.error(`❌ [DataSync] GA4 sync failed for ${client.name}:`, error.message);
      
      // Log the error
      await DailyMetrics.findOneAndUpdate(
        { client: clientId, date: today, source: 'ga4' },
        {
          $set: { syncStatus: 'failed' },
          $push: { 
            syncErrors: { 
              source: 'ga4', 
              message: error.message, 
              timestamp: new Date() 
            } 
          }
        },
        { upsert: true }
      );
      
      return null;
    }
  }

  /**
   * Sync GSC data for a single client
   */
  async syncClientGSC(clientId) {
    const client = await Client.findById(clientId);
    if (!client || !client.integrations?.gscSiteUrl) {
      console.log(`⚠️ [DataSync] Client ${clientId} has no GSC site configured`);
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      console.log(`🔍 [DataSync] Syncing GSC for: ${client.name}`);
      
      // GSC data has 2-3 day delay
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const startDate = threeDaysAgo.toISOString().split('T')[0];
      const endDate = startDate;

      const gscData = await gscService.getSearchAnalytics(
        client.integrations.gscSiteUrl,
        startDate,
        endDate
      );

      // Aggregate totals
      let totalClicks = 0;
      let totalImpressions = 0;
      let totalPosition = 0;
      let rowCount = 0;

      if (gscData.rows) {
        gscData.rows.forEach(row => {
          totalClicks += row.clicks || 0;
          totalImpressions += row.impressions || 0;
          totalPosition += row.position || 0;
          rowCount++;
        });
      }

      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgPosition = rowCount > 0 ? totalPosition / rowCount : 0;

      const metrics = await DailyMetrics.findOneAndUpdate(
        { 
          client: clientId, 
          date: threeDaysAgo,
          source: 'gsc'
        },
        {
          client: clientId,
          date: threeDaysAgo,
          source: 'gsc',
          gsc: {
            clicks: totalClicks,
            impressions: totalImpressions,
            ctr: avgCTR,
            position: avgPosition
          },
          syncStatus: 'success'
        },
        { upsert: true, new: true }
      );

      console.log(`✅ [DataSync] GSC synced for ${client.name}: ${totalClicks} clicks, ${totalImpressions} impressions`);
      return metrics;

    } catch (error) {
      console.error(`❌ [DataSync] GSC sync failed for ${client.name}:`, error.message);
      
      await DailyMetrics.findOneAndUpdate(
        { client: clientId, date: today, source: 'gsc' },
        {
          $set: { syncStatus: 'failed' },
          $push: { 
            syncErrors: { 
              source: 'gsc', 
              message: error.message, 
              timestamp: new Date() 
            } 
          }
        },
        { upsert: true }
      );
      
      return null;
    }
  }

  /**
   * Sync GBP data for a single client
   */
  async syncClientGBP(clientId) {
    const client = await Client.findById(clientId);
    if (!client || !client.integrations?.gbpLocationIds?.length) {
      console.log(`⚠️ [DataSync] Client ${clientId} has no GBP locations configured`);
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      console.log(`📍 [DataSync] Syncing GBP for: ${client.name}`);
      
      // Aggregate data from all locations
      let totalViews = 0;
      let totalSearches = 0;
      let totalActions = 0;
      let totalCalls = 0;
      let totalDirections = 0;
      let totalWebsiteClicks = 0;

      for (const locationId of client.integrations.gbpLocationIds) {
        try {
          const gbpData = await gbpService.getLocationMetrics(locationId);
          
          if (gbpData) {
            totalViews += gbpData.views || 0;
            totalSearches += gbpData.searches || 0;
            totalActions += gbpData.actions || 0;
            totalCalls += gbpData.calls || 0;
            totalDirections += gbpData.directions || 0;
            totalWebsiteClicks += gbpData.websiteClicks || 0;
          }
        } catch (locError) {
          console.warn(`⚠️ [DataSync] GBP location ${locationId} failed:`, locError.message);
        }
      }

      const metrics = await DailyMetrics.findOneAndUpdate(
        { 
          client: clientId, 
          date: today,
          source: 'gbp'
        },
        {
          client: clientId,
          date: today,
          source: 'gbp',
          gbp: {
            views: totalViews,
            searches: totalSearches,
            actions: totalActions,
            calls: totalCalls,
            directions: totalDirections,
            websiteClicks: totalWebsiteClicks
          },
          syncStatus: 'success'
        },
        { upsert: true, new: true }
      );

      console.log(`✅ [DataSync] GBP synced for ${client.name}: ${totalViews} views, ${totalActions} actions`);
      return metrics;

    } catch (error) {
      console.error(`❌ [DataSync] GBP sync failed for ${client.name}:`, error.message);
      
      await DailyMetrics.findOneAndUpdate(
        { client: clientId, date: today, source: 'gbp' },
        {
          $set: { syncStatus: 'failed' },
          $push: { 
            syncErrors: { 
              source: 'gbp', 
              message: error.message, 
              timestamp: new Date() 
            } 
          }
        },
        { upsert: true }
      );
      
      return null;
    }
  }

  /**
   * Sync all data sources for all active clients
   */
  async syncAllClients() {
    if (this.syncInProgress) {
      console.log('⚠️ [DataSync] Sync already in progress, skipping...');
      return { status: 'skipped', reason: 'sync_in_progress' };
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    
    console.log('🚀 [DataSync] Starting full sync for all clients...');

    try {
      const clients = await Client.find({ isActive: true });
      console.log(`📋 [DataSync] Found ${clients.length} active clients`);

      const results = {
        total: clients.length,
        ga4: { success: 0, failed: 0, skipped: 0 },
        gsc: { success: 0, failed: 0, skipped: 0 },
        gbp: { success: 0, failed: 0, skipped: 0 }
      };

      for (const client of clients) {
        // GA4 Sync
        if (client.integrations?.ga4PropertyId) {
          const ga4Result = await this.syncClientGA4(client._id);
          if (ga4Result) results.ga4.success++;
          else results.ga4.failed++;
        } else {
          results.ga4.skipped++;
        }

        // GSC Sync
        if (client.integrations?.gscSiteUrl) {
          const gscResult = await this.syncClientGSC(client._id);
          if (gscResult) results.gsc.success++;
          else results.gsc.failed++;
        } else {
          results.gsc.skipped++;
        }

        // GBP Sync
        if (client.integrations?.gbpLocationIds?.length) {
          const gbpResult = await this.syncClientGBP(client._id);
          if (gbpResult) results.gbp.success++;
          else results.gbp.failed++;
        } else {
          results.gbp.skipped++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [DataSync] Full sync completed in ${(duration / 1000).toFixed(1)}s`);
      console.log(`   GA4: ${results.ga4.success} success, ${results.ga4.failed} failed, ${results.ga4.skipped} skipped`);
      console.log(`   GSC: ${results.gsc.success} success, ${results.gsc.failed} failed, ${results.gsc.skipped} skipped`);
      console.log(`   GBP: ${results.gbp.success} success, ${results.gbp.failed} failed, ${results.gbp.skipped} skipped`);

      return { status: 'complete', duration, results };

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get sync status for a client
   */
  async getSyncStatus(clientId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const metrics = await DailyMetrics.find({
      client: clientId,
      date: { $gte: yesterday }
    }).sort({ date: -1 });

    const status = {
      lastSync: null,
      sources: {
        ga4: { status: 'no_data', lastSync: null },
        gsc: { status: 'no_data', lastSync: null },
        gbp: { status: 'no_data', lastSync: null }
      }
    };

    metrics.forEach(m => {
      if (!status.lastSync || m.updatedAt > status.lastSync) {
        status.lastSync = m.updatedAt;
      }
      
      if (m.source && status.sources[m.source]) {
        status.sources[m.source] = {
          status: m.syncStatus,
          lastSync: m.updatedAt,
          errors: m.syncErrors
        };
      }
    });

    return status;
  }

  /**
   * Get metrics history for a client
   */
  async getMetricsHistory(clientId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return DailyMetrics.find({
      client: clientId,
      date: { $gte: startDate }
    }).sort({ date: 1 });
  }
}

module.exports = new DataSyncService();
