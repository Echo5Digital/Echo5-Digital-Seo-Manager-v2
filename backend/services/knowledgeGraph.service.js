/**
 * Knowledge Graph Service
 * 
 * Builds and maintains the SEO Knowledge Graph for each client
 * Enables AI to understand relationships between entities
 */

const SEOKnowledgeGraph = require('../models/SEOKnowledgeGraph.model');
const Client = require('../models/Client.model');
const Keyword = require('../models/Keyword.model');
const Page = require('../models/Page.model');
const Backlink = require('../models/Backlink.model');
const RankHistory = require('../models/RankHistory.model');
const aiService = require('./ai.service');
const mongoose = require('mongoose');

class KnowledgeGraphService {
  /**
   * Build or update the knowledge graph for a client
   */
  async buildClientGraph(clientId) {
    console.log(`🧠 [KnowledgeGraph] Building graph for client: ${clientId}`);
    
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // Get or create the graph
    let graph = await SEOKnowledgeGraph.getOrCreate(clientId);

    // Update build status
    graph.buildStatus.status = 'building';
    await graph.save();

    try {
      // Build each section
      await this.buildBrandEntity(graph, client);
      await this.buildKeywordClusters(graph, client);
      await this.buildPageEntities(graph, client);
      await this.buildLocationEntities(graph, client);
      await this.buildCompetitorEntities(graph, client);
      await this.buildBacklinkProfile(graph, client);
      await this.buildRelationships(graph);

      // Generate AI insights
      await this.generateInsights(graph, client);

      // Update status
      graph.buildStatus.status = 'complete';
      graph.buildStatus.lastFullBuild = new Date();
      graph.version += 1;
      await graph.save();

      console.log(`✅ [KnowledgeGraph] Graph built for ${client.name}`);
      return graph;

    } catch (error) {
      console.error(`❌ [KnowledgeGraph] Build failed:`, error.message);
      graph.buildStatus.status = 'error';
      graph.buildStatus.errors.push(error.message);
      await graph.save();
      throw error;
    }
  }

  /**
   * Build brand entity from client data
   */
  async buildBrandEntity(graph, client) {
    graph.brand = {
      name: client.name,
      variations: this.generateBrandVariations(client.name),
      industry: client.industry,
      targetAudience: [], // Can be populated later
      uniqueSellingPoints: client.services || [],
      brandVoice: 'professional' // Default
    };

    graph.buildStatus.completeness.brand = 100;
  }

  /**
   * Generate common brand name variations
   */
  generateBrandVariations(name) {
    const variations = [name];
    
    // Add lowercase version
    variations.push(name.toLowerCase());
    
    // Remove common suffixes
    const withoutSuffixes = name
      .replace(/\s*(LLC|Inc|Corp|Ltd|Co)\s*\.?$/i, '')
      .trim();
    if (withoutSuffixes !== name) {
      variations.push(withoutSuffixes);
    }
    
    // Add abbreviated version (first letters)
    const words = name.split(/\s+/);
    if (words.length > 1) {
      const abbrev = words.map(w => w[0]).join('').toUpperCase();
      if (abbrev.length >= 2) {
        variations.push(abbrev);
      }
    }

    return [...new Set(variations)];
  }

  /**
   * Build keyword clusters from client keywords
   */
  async buildKeywordClusters(graph, client) {
    const allKeywords = [
      ...(client.primaryKeywords || []).map(k => ({ ...k.toObject ? k.toObject() : k, type: 'primary' })),
      ...(client.secondaryKeywords || []).map(k => ({ ...k.toObject ? k.toObject() : k, type: 'secondary' })),
      ...(client.seedKeywords || []).map(k => ({ ...k.toObject ? k.toObject() : k, type: 'seed' }))
    ];

    if (allKeywords.length === 0) {
      graph.buildStatus.completeness.keywords = 0;
      return;
    }

    // Try to cluster keywords using AI
    try {
      const keywordStrings = allKeywords
        .filter(k => k.keyword)
        .map(k => k.keyword);

      if (keywordStrings.length > 0) {
        const clustered = await aiService.clusterKeywords(keywordStrings, client.industry);
        
        if (clustered.clusters) {
          graph.keywordClusters = clustered.clusters.map((cluster, idx) => ({
            id: new mongoose.Types.ObjectId().toString(),
            name: cluster.name || `Cluster ${idx + 1}`,
            intent: cluster.intent || 'informational',
            keywords: cluster.keywords.map(kw => {
              const original = allKeywords.find(k => k.keyword === kw);
              return {
                term: kw,
                volume: original?.searchVolume || 0,
                difficulty: original?.difficulty || 50,
                currentRank: null,
                targetRank: original?.type === 'primary' ? 3 : 10,
                assignedPage: null,
                trend: 'new'
              };
            }),
            relatedClusters: [],
            contentGaps: [],
            priority: cluster.priority || 3
          }));
        }
      }
    } catch (error) {
      console.warn('⚠️ [KnowledgeGraph] AI clustering failed, using basic grouping:', error.message);
      
      // Fallback: group by type
      graph.keywordClusters = [{
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Primary Keywords',
        intent: 'transactional',
        keywords: allKeywords.filter(k => k.type === 'primary').map(k => ({
          term: k.keyword,
          volume: k.searchVolume || 0,
          difficulty: k.difficulty || 50,
          currentRank: null,
          targetRank: 3,
          assignedPage: null,
          trend: 'new'
        })),
        priority: 1
      }, {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Secondary Keywords',
        intent: 'informational',
        keywords: allKeywords.filter(k => k.type === 'secondary').map(k => ({
          term: k.keyword,
          volume: k.searchVolume || 0,
          difficulty: k.difficulty || 50,
          currentRank: null,
          targetRank: 10,
          assignedPage: null,
          trend: 'new'
        })),
        priority: 2
      }];
    }

    graph.buildStatus.completeness.keywords = 100;
  }

  /**
   * Build page entities from crawled/audited pages
   */
  async buildPageEntities(graph, client) {
    const pages = await Page.find({ client: client._id });

    if (pages.length === 0) {
      graph.buildStatus.completeness.pages = 0;
      return;
    }

    graph.pages = pages.map(page => ({
      url: page.url,
      title: page.title,
      type: this.inferPageType(page.url, page.title),
      targetKeywords: page.targetKeywords || [],
      currentRankings: [],
      internalLinksTo: page.internalLinks || [],
      internalLinksFrom: [],
      externalBacklinks: 0,
      seoScore: page.seoScore || 0,
      contentLength: page.contentLength || 0,
      lastUpdated: page.lastCrawled || page.updatedAt,
      issues: page.issues || [],
      opportunities: []
    }));

    // Build internal link relationships
    graph.pages.forEach(page => {
      graph.pages.forEach(otherPage => {
        if (page.internalLinksTo?.includes(otherPage.url)) {
          if (!otherPage.internalLinksFrom) otherPage.internalLinksFrom = [];
          otherPage.internalLinksFrom.push(page.url);
        }
      });
    });

    graph.buildStatus.completeness.pages = 100;
  }

  /**
   * Infer page type from URL and title
   */
  inferPageType(url, title) {
    const urlLower = (url || '').toLowerCase();
    const titleLower = (title || '').toLowerCase();

    if (urlLower.endsWith('/') || urlLower.match(/\/$|\/index\.(html|php|asp)$/)) {
      return 'homepage';
    }
    if (urlLower.includes('/blog/') || urlLower.includes('/post/') || urlLower.includes('/article/')) {
      return 'blog';
    }
    if (urlLower.includes('/service') || urlLower.includes('/what-we-do')) {
      return 'service';
    }
    if (urlLower.includes('/product') || urlLower.includes('/shop/')) {
      return 'product';
    }
    if (urlLower.includes('/location') || urlLower.includes('/areas-served')) {
      return 'location';
    }
    if (urlLower.includes('/category/') || urlLower.includes('/tag/')) {
      return 'category';
    }
    if (urlLower.includes('/landing') || urlLower.includes('/lp/')) {
      return 'landing';
    }

    return 'other';
  }

  /**
   * Build location entities from client locations
   */
  async buildLocationEntities(graph, client) {
    if (!client.locations || client.locations.length === 0) {
      graph.buildStatus.completeness.locations = 0;
      return;
    }

    graph.locations = client.locations.map(loc => ({
      id: new mongoose.Types.ObjectId().toString(),
      city: loc.city,
      state: loc.state,
      country: loc.country || 'US',
      zip: loc.zip,
      radius: loc.radius || 25,
      radiusUnit: loc.radiusUnit || 'miles',
      keywords: [],
      landingPage: null,
      gbpConnected: false,
      gbpId: null,
      localRankings: [],
      competitors: []
    }));

    // Check for GBP connections
    if (client.integrations?.gbpLocationIds?.length) {
      graph.locations.forEach((loc, idx) => {
        if (client.integrations.gbpLocationIds[idx]) {
          loc.gbpConnected = true;
          loc.gbpId = client.integrations.gbpLocationIds[idx];
        }
      });
    }

    graph.buildStatus.completeness.locations = 100;
  }

  /**
   * Build competitor entities
   */
  async buildCompetitorEntities(graph, client) {
    if (!client.competitors || client.competitors.length === 0) {
      graph.buildStatus.completeness.competitors = 0;
      return;
    }

    graph.competitors = client.competitors.map(comp => ({
      domain: typeof comp === 'string' ? comp : comp.domain,
      name: typeof comp === 'string' ? comp : comp.name,
      overlapKeywords: [],
      strengthAreas: [],
      weaknessAreas: [],
      estimatedTraffic: null,
      domainAuthority: null,
      backlinks: null,
      lastAnalyzed: null
    }));

    graph.buildStatus.completeness.competitors = 50; // Basic info only
  }

  /**
   * Build backlink profile summary
   */
  async buildBacklinkProfile(graph, client) {
    const backlinks = await Backlink.find({ client: client._id });

    if (backlinks.length === 0) {
      graph.buildStatus.completeness.backlinks = 0;
      return;
    }

    const referringDomains = new Set();
    let totalDA = 0;
    let daCount = 0;
    const anchorTexts = {};

    backlinks.forEach(bl => {
      // Extract domain from sourceUrl
      try {
        const domain = new URL(bl.sourceUrl).hostname;
        referringDomains.add(domain);
      } catch (e) {}

      if (bl.domainMetrics?.da) {
        totalDA += bl.domainMetrics.da;
        daCount++;
      }

      // Count anchor texts
      if (bl.anchorText) {
        anchorTexts[bl.anchorText] = (anchorTexts[bl.anchorText] || 0) + 1;
      }
    });

    // Sort anchor texts by count
    const sortedAnchors = Object.entries(anchorTexts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    graph.backlinkProfile = {
      totalBacklinks: backlinks.length,
      referringDomains: referringDomains.size,
      avgDomainAuthority: daCount > 0 ? Math.round(totalDA / daCount) : 0,
      topReferrers: [], // Would need domain-level aggregation
      anchorTextDistribution: sortedAnchors.map(([text, count]) => ({
        text,
        count,
        percentage: Math.round((count / backlinks.length) * 100)
      })),
      linkVelocity: {
        last30Days: backlinks.filter(bl => 
          bl.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        last90Days: backlinks.filter(bl => 
          bl.createdAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        ).length,
        trend: 'stable'
      }
    };

    graph.buildStatus.completeness.backlinks = 100;
  }

  /**
   * Build relationships between entities
   */
  async buildRelationships(graph) {
    graph.relationships = [];

    // Keyword -> Page relationships (targets)
    graph.keywordClusters?.forEach(cluster => {
      cluster.keywords?.forEach(kw => {
        if (kw.assignedPage) {
          graph.relationships.push({
            fromEntity: { type: 'keyword', id: kw.term },
            toEntity: { type: 'page', id: kw.assignedPage },
            relationshipType: 'targets',
            strength: 80
          });
        }
      });
    });

    // Page -> Page relationships (internal links)
    graph.pages?.forEach(page => {
      page.internalLinksTo?.forEach(linkedUrl => {
        graph.relationships.push({
          fromEntity: { type: 'page', id: page.url },
          toEntity: { type: 'page', id: linkedUrl },
          relationshipType: 'links_to',
          strength: 50
        });
      });
    });

    // Location -> Keyword relationships
    graph.locations?.forEach(loc => {
      loc.keywords?.forEach(kw => {
        graph.relationships.push({
          fromEntity: { type: 'location', id: loc.id },
          toEntity: { type: 'keyword', id: kw },
          relationshipType: 'serves',
          strength: 70
        });
      });
    });
  }

  /**
   * Generate AI insights for the graph
   */
  async generateInsights(graph, client) {
    try {
      // Build summary for AI
      const graphSummary = {
        brand: graph.brand?.name,
        industry: graph.brand?.industry,
        keywordClusters: graph.keywordClusters?.length || 0,
        totalKeywords: graph.keywordClusters?.reduce((sum, c) => sum + (c.keywords?.length || 0), 0) || 0,
        pages: graph.pages?.length || 0,
        locations: graph.locations?.length || 0,
        competitors: graph.competitors?.length || 0,
        backlinks: graph.backlinkProfile?.totalBacklinks || 0,
        contentGaps: this.identifyContentGaps(graph)
      };

      const prompt = `Analyze this SEO knowledge graph and provide strategic insights:

Business: ${graphSummary.brand} (${graphSummary.industry})
Keyword Clusters: ${graphSummary.keywordClusters} clusters with ${graphSummary.totalKeywords} keywords
Pages: ${graphSummary.pages}
Locations: ${graphSummary.locations}
Competitors: ${graphSummary.competitors}
Backlinks: ${graphSummary.backlinks}
Content Gaps: ${graphSummary.contentGaps.join(', ') || 'None identified'}

Provide:
1. Top 3 opportunities (with impact level)
2. Top 3 risks
3. One sentence executive summary`;

      // This would use OpenAI through existing service
      // For now, generate placeholder insights
      graph.insights = {
        opportunities: this.generatePlaceholderOpportunities(graph),
        risks: this.generatePlaceholderRisks(graph),
        summary: `${client.name} has a ${this.assessStrength(graph)} SEO foundation with ${graph.keywordClusters?.length || 0} keyword clusters and ${graph.pages?.length || 0} indexed pages.`,
        generatedAt: new Date(),
        confidence: 70
      };

    } catch (error) {
      console.warn('⚠️ [KnowledgeGraph] Insight generation failed:', error.message);
      graph.insights = {
        opportunities: [],
        risks: [],
        summary: 'Insights generation pending.',
        generatedAt: new Date(),
        confidence: 0
      };
    }
  }

  /**
   * Identify content gaps in the graph
   */
  identifyContentGaps(graph) {
    const gaps = [];

    // Check if each keyword cluster has assigned pages
    graph.keywordClusters?.forEach(cluster => {
      const unassigned = cluster.keywords?.filter(k => !k.assignedPage);
      if (unassigned?.length > 0) {
        gaps.push(`${cluster.name}: ${unassigned.length} keywords without pages`);
      }
    });

    // Check locations without landing pages
    const locationsWithoutPages = graph.locations?.filter(l => !l.landingPage);
    if (locationsWithoutPages?.length > 0) {
      gaps.push(`${locationsWithoutPages.length} locations need landing pages`);
    }

    return gaps;
  }

  /**
   * Assess overall SEO strength
   */
  assessStrength(graph) {
    let score = 0;
    
    if (graph.keywordClusters?.length > 0) score += 20;
    if (graph.pages?.length > 5) score += 20;
    if (graph.backlinkProfile?.totalBacklinks > 10) score += 20;
    if (graph.locations?.length > 0) score += 10;
    if (graph.competitors?.length > 0) score += 10;
    if (graph.buildStatus?.completeness?.keywords === 100) score += 20;

    if (score >= 80) return 'strong';
    if (score >= 50) return 'moderate';
    return 'developing';
  }

  /**
   * Generate placeholder opportunities
   */
  generatePlaceholderOpportunities(graph) {
    const opportunities = [];

    if (!graph.keywordClusters?.length) {
      opportunities.push({
        id: new mongoose.Types.ObjectId().toString(),
        type: 'keyword',
        title: 'Define Keyword Strategy',
        description: 'Add primary and secondary keywords to build topical authority',
        impact: 'high',
        effort: 'medium',
        relatedEntities: [],
        suggestedActions: ['Research competitor keywords', 'Define primary keywords', 'Create keyword clusters'],
        estimatedTrafficGain: 500,
        priority: 1
      });
    }

    if (graph.pages?.length < 10) {
      opportunities.push({
        id: new mongoose.Types.ObjectId().toString(),
        type: 'content',
        title: 'Expand Content Library',
        description: 'Create more content pages to target additional keywords',
        impact: 'high',
        effort: 'high',
        relatedEntities: [],
        suggestedActions: ['Identify content gaps', 'Create content calendar', 'Develop blog strategy'],
        estimatedTrafficGain: 1000,
        priority: 2
      });
    }

    if (graph.backlinkProfile?.totalBacklinks < 20) {
      opportunities.push({
        id: new mongoose.Types.ObjectId().toString(),
        type: 'backlink',
        title: 'Build Backlink Profile',
        description: 'Increase domain authority through quality backlinks',
        impact: 'medium',
        effort: 'high',
        relatedEntities: [],
        suggestedActions: ['Guest posting outreach', 'Resource link building', 'PR campaigns'],
        estimatedTrafficGain: 300,
        priority: 3
      });
    }

    return opportunities;
  }

  /**
   * Generate placeholder risks
   */
  generatePlaceholderRisks(graph) {
    const risks = [];

    if (graph.competitors?.length === 0) {
      risks.push({
        id: new mongoose.Types.ObjectId().toString(),
        type: 'competitor_threat',
        title: 'Unknown Competitive Landscape',
        description: 'No competitors tracked - may miss market changes',
        severity: 'medium',
        relatedEntities: [],
        mitigationSteps: ['Identify top 3-5 competitors', 'Monitor their rankings', 'Analyze their content']
      });
    }

    if (!graph.locations?.some(l => l.gbpConnected)) {
      risks.push({
        id: new mongoose.Types.ObjectId().toString(),
        type: 'technical_issue',
        title: 'No GBP Integration',
        description: 'Missing local SEO optimization opportunities',
        severity: 'low',
        relatedEntities: [],
        mitigationSteps: ['Connect Google Business Profile', 'Optimize GBP listing', 'Build local citations']
      });
    }

    return risks;
  }

  /**
   * Get knowledge graph for a client
   */
  async getGraph(clientId) {
    return SEOKnowledgeGraph.getWithClient(clientId);
  }

  /**
   * Get graph visualization data (for D3.js or similar)
   */
  async getVisualizationData(clientId) {
    const graph = await this.getGraph(clientId);
    if (!graph) return null;

    const nodes = [];
    const links = [];

    // Add brand as central node
    if (graph.brand?.name) {
      nodes.push({
        id: 'brand',
        label: graph.brand.name,
        type: 'brand',
        size: 40
      });
    }

    // Add keyword cluster nodes
    graph.keywordClusters?.forEach(cluster => {
      nodes.push({
        id: `cluster-${cluster.id}`,
        label: cluster.name,
        type: 'cluster',
        size: 25,
        data: { keywordCount: cluster.keywords?.length || 0 }
      });

      links.push({
        source: 'brand',
        target: `cluster-${cluster.id}`,
        type: 'has_cluster'
      });
    });

    // Add page nodes
    graph.pages?.slice(0, 20).forEach((page, idx) => {
      nodes.push({
        id: `page-${idx}`,
        label: page.title || page.url,
        type: 'page',
        size: 15,
        data: { url: page.url, seoScore: page.seoScore }
      });
    });

    // Add location nodes
    graph.locations?.forEach(loc => {
      nodes.push({
        id: `location-${loc.id}`,
        label: `${loc.city}, ${loc.state}`,
        type: 'location',
        size: 20
      });

      links.push({
        source: 'brand',
        target: `location-${loc.id}`,
        type: 'serves'
      });
    });

    return { nodes, links };
  }
}

module.exports = new KnowledgeGraphService();
