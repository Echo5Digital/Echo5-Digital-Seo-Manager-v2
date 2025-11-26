/**
 * Client Intelligence Service
 * 
 * Provides unified client profiles by aggregating data from all sources:
 * GA4, GSC, GBP, Rank Tracker, Backlinks, Audits
 */

const Client = require('../models/Client.model');
const DailyMetrics = require('../models/DailyMetrics.model');
const Audit = require('../models/Audit.model');
const Keyword = require('../models/Keyword.model');
const Backlink = require('../models/Backlink.model');
const RankHistory = require('../models/RankHistory.model');
const SEOKnowledgeGraph = require('../models/SEOKnowledgeGraph.model');
const deltaTrackingService = require('./deltaTracking.service');
const aiService = require('./ai.service');

class ClientIntelligenceService {
  /**
   * Get complete intelligence profile for a client
   */
  async getClientIntelligence(clientId) {
    const client = await Client.findById(clientId)
      .populate('assignedStaff', 'name email role')
      .lean();

    if (!client) {
      throw new Error('Client not found');
    }

    // Gather all data in parallel
    const [
      latestMetrics,
      trends,
      rankings,
      backlinks,
      latestAudit,
      knowledgeGraph
    ] = await Promise.all([
      DailyMetrics.getLatestMetrics(clientId),
      deltaTrackingService.getTrendSummary(clientId),
      this.getRankingSummary(clientId),
      this.getBacklinkSummary(clientId),
      Audit.findOne({ client: clientId }).sort({ createdAt: -1 }),
      SEOKnowledgeGraph.findOne({ client: clientId })
    ]);

    // Build unified profile
    const profile = {
      // Basic Info
      client: {
        id: client._id,
        name: client.name,
        domain: client.domain,
        website: client.website,
        industry: client.industry,
        locations: client.locations,
        services: client.services,
        assignedStaff: client.assignedStaff
      },

      // Analytics (GA4)
      analytics: latestMetrics?.ga4 ? {
        users: latestMetrics.ga4.users,
        newUsers: latestMetrics.ga4.newUsers,
        sessions: latestMetrics.ga4.sessions,
        pageviews: latestMetrics.ga4.pageviews,
        bounceRate: Math.round(latestMetrics.ga4.bounceRate * 100) / 100,
        avgSessionDuration: this.formatDuration(latestMetrics.ga4.avgSessionDuration),
        engagementRate: latestMetrics.ga4.engagementRate,
        trend: trends?.trends?.traffic || null,
        lastUpdated: latestMetrics.updatedAt
      } : null,

      // Search Console (GSC)
      searchConsole: latestMetrics?.gsc ? {
        clicks: latestMetrics.gsc.clicks,
        impressions: latestMetrics.gsc.impressions,
        ctr: Math.round(latestMetrics.gsc.ctr * 100) / 100,
        avgPosition: Math.round(latestMetrics.gsc.position * 10) / 10,
        trend: trends?.trends?.clicks || null,
        lastUpdated: latestMetrics.updatedAt
      } : null,

      // Google Business Profile
      googleBusiness: latestMetrics?.gbp ? {
        views: latestMetrics.gbp.views,
        searches: latestMetrics.gbp.searches,
        actions: latestMetrics.gbp.actions,
        calls: latestMetrics.gbp.calls,
        directions: latestMetrics.gbp.directions,
        websiteClicks: latestMetrics.gbp.websiteClicks,
        trend: trends?.trends?.localVisibility || null,
        lastUpdated: latestMetrics.updatedAt
      } : null,

      // Rank Tracking
      rankings,

      // Backlinks
      backlinks,

      // SEO Health (from latest audit)
      seoHealth: client.seoHealth || latestAudit ? {
        score: client.seoHealth?.score || latestAudit?.overallScore || 0,
        criticalIssues: client.seoHealth?.criticalIssues || 0,
        highIssues: client.seoHealth?.highIssues || 0,
        mediumIssues: client.seoHealth?.mediumIssues || 0,
        lowIssues: client.seoHealth?.lowIssues || 0,
        lastAuditDate: latestAudit?.createdAt || client.seoHealth?.lastChecked,
        lastAuditId: latestAudit?._id
      } : null,

      // Keywords Summary
      keywords: {
        primary: client.primaryKeywords?.length || 0,
        secondary: client.secondaryKeywords?.length || 0,
        seed: client.seedKeywords?.length || 0,
        total: (client.primaryKeywords?.length || 0) + 
               (client.secondaryKeywords?.length || 0) + 
               (client.seedKeywords?.length || 0)
      },

      // Integrations Status
      integrations: {
        ga4: !!client.integrations?.ga4PropertyId,
        gsc: !!client.integrations?.gscSiteUrl,
        gbp: client.integrations?.gbpLocationIds?.length > 0,
        wordPressPlugin: !!client.wordPressPlugin?.apiKey
      },

      // Knowledge Graph Completeness
      knowledgeGraph: knowledgeGraph ? {
        hasGraph: true,
        completeness: knowledgeGraph.buildStatus?.completeness || {},
        lastUpdated: knowledgeGraph.updatedAt,
        insightsCount: (knowledgeGraph.insights?.opportunities?.length || 0) + 
                       (knowledgeGraph.insights?.risks?.length || 0)
      } : {
        hasGraph: false,
        completeness: {},
        lastUpdated: null,
        insightsCount: 0
      },

      // Meta
      lastDataSync: latestMetrics?.updatedAt || null,
      profileGeneratedAt: new Date()
    };

    return profile;
  }

  /**
   * Get ranking summary for a client
   */
  async getRankingSummary(clientId) {
    const client = await Client.findById(clientId);
    if (!client) return null;

    // Get all tracked keywords
    const keywords = await Keyword.find({ client: clientId });
    const recentRanks = await RankHistory.find({ 
      client: clientId,
      checkedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ checkedAt: -1 });

    // Calculate summary
    const positions = recentRanks.filter(r => r.position > 0).map(r => r.position);
    const avgPosition = positions.length > 0 
      ? positions.reduce((a, b) => a + b, 0) / positions.length 
      : 0;

    let improved = 0;
    let declined = 0;
    let unchanged = 0;

    recentRanks.forEach(r => {
      if (r.previousPosition && r.position) {
        if (r.position < r.previousPosition) improved++;
        else if (r.position > r.previousPosition) declined++;
        else unchanged++;
      }
    });

    return {
      trackedKeywords: keywords.length,
      avgPosition: Math.round(avgPosition * 10) / 10,
      top3Count: positions.filter(p => p <= 3).length,
      top10Count: positions.filter(p => p <= 10).length,
      top20Count: positions.filter(p => p <= 20).length,
      top100Count: positions.filter(p => p <= 100).length,
      notRanking: keywords.length - positions.length,
      movements: { improved, declined, unchanged }
    };
  }

  /**
   * Get backlink summary for a client
   */
  async getBacklinkSummary(clientId) {
    const backlinks = await Backlink.find({ client: clientId });

    const statusCounts = {
      live: 0,
      pending: 0,
      broken: 0,
      removed: 0
    };

    let totalDA = 0;
    let totalPA = 0;
    let daCount = 0;

    backlinks.forEach(bl => {
      const status = bl.status?.toLowerCase() || 'pending';
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }

      if (bl.domainMetrics?.da) {
        totalDA += bl.domainMetrics.da;
        totalPA += bl.domainMetrics.pa || 0;
        daCount++;
      }
    });

    return {
      total: backlinks.length,
      ...statusCounts,
      avgDA: daCount > 0 ? Math.round(totalDA / daCount) : 0,
      avgPA: daCount > 0 ? Math.round(totalPA / daCount) : 0
    };
  }

  /**
   * Generate AI insights for a client
   */
  async generateAIInsights(clientId) {
    const intelligence = await this.getClientIntelligence(clientId);
    
    // Build context for AI
    const context = {
      clientName: intelligence.client.name,
      industry: intelligence.client.industry,
      seoHealth: intelligence.seoHealth,
      rankings: intelligence.rankings,
      analytics: intelligence.analytics,
      searchConsole: intelligence.searchConsole,
      backlinks: intelligence.backlinks
    };

    try {
      // Use existing AI service
      const summary = await aiService.generateExecutiveSummary(context);
      
      return {
        summary: summary.summary,
        priorities: summary.priorities || [],
        opportunities: summary.opportunities || [],
        risks: summary.risks || [],
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ [ClientIntelligence] AI insights failed:', error.message);
      return null;
    }
  }

  /**
   * Get all clients intelligence overview (for dashboard)
   */
  async getAllClientsOverview(userId = null, role = 'Boss') {
    let query = { isActive: true };

    // If staff user, only show assigned clients
    if (role === 'Staff' && userId) {
      query.assignedStaff = userId;
    }

    const clients = await Client.find(query)
      .select('name domain industry seoHealth')
      .lean();

    const overview = await Promise.all(
      clients.map(async (client) => {
        const latestMetrics = await DailyMetrics.getLatestMetrics(client._id);
        
        return {
          id: client._id,
          name: client.name,
          domain: client.domain,
          industry: client.industry,
          seoScore: client.seoHealth?.score || 0,
          criticalIssues: client.seoHealth?.criticalIssues || 0,
          users: latestMetrics?.ga4?.users || 0,
          clicks: latestMetrics?.gsc?.clicks || 0,
          impressions: latestMetrics?.gsc?.impressions || 0,
          lastUpdated: latestMetrics?.updatedAt || null
        };
      })
    );

    // Sort by SEO score (lowest first - needs attention)
    overview.sort((a, b) => a.seoScore - b.seoScore);

    return {
      totalClients: clients.length,
      avgSEOScore: overview.length > 0 
        ? Math.round(overview.reduce((a, b) => a + b.seoScore, 0) / overview.length)
        : 0,
      clientsNeedingAttention: overview.filter(c => c.seoScore < 50 || c.criticalIssues > 0).length,
      clients: overview
    };
  }

  /**
   * Format seconds to duration string
   */
  formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

module.exports = new ClientIntelligenceService();
