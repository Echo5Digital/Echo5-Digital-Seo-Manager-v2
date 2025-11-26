const mongoose = require('mongoose');

/**
 * SEO Knowledge Graph Model
 * 
 * Stores a structured, interconnected view of a client's SEO profile
 * Enables AI to understand relationships between keywords, pages, competitors, and locations
 */

const seoKnowledgeGraphSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
    unique: true,
    index: true
  },
  
  // Brand Entity
  brand: {
    name: String,
    variations: [String],           // 'Echo5', 'Echo 5 Digital', 'E5D'
    industry: String,
    targetAudience: [String],
    uniqueSellingPoints: [String],
    brandVoice: String              // 'professional', 'casual', 'technical'
  },
  
  // Keyword Clusters - Topical groupings of keywords
  keywordClusters: [{
    id: { type: String, required: true },
    name: String,                    // 'Web Design Services'
    intent: {
      type: String,
      enum: ['informational', 'navigational', 'transactional', 'commercial'],
      default: 'informational'
    },
    pillarPage: String,              // Main page for this cluster
    keywords: [{
      term: String,
      volume: Number,
      difficulty: Number,
      currentRank: Number,
      targetRank: Number,
      assignedPage: String,
      lastChecked: Date,
      trend: {
        type: String,
        enum: ['up', 'down', 'stable', 'new'],
        default: 'new'
      }
    }],
    relatedClusters: [String],       // IDs of related clusters
    contentGaps: [String],           // Missing content opportunities
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  }],
  
  // Page Entities - Site structure mapping
  pages: [{
    url: { type: String, required: true },
    title: String,
    type: {
      type: String,
      enum: ['homepage', 'service', 'product', 'blog', 'location', 'category', 'landing', 'other'],
      default: 'other'
    },
    targetKeywords: [String],
    currentRankings: [{
      keyword: String,
      position: Number,
      lastChecked: Date
    }],
    internalLinksTo: [String],       // URLs this page links to
    internalLinksFrom: [String],     // URLs that link to this page
    externalBacklinks: Number,
    seoScore: {
      type: Number,
      min: 0,
      max: 100
    },
    contentLength: Number,
    lastUpdated: Date,
    issues: [{
      type: String,
      severity: String,
      description: String
    }],
    opportunities: [String]
  }],
  
  // Location Entities - For local SEO
  locations: [{
    id: { type: String, required: true },
    city: String,
    state: String,
    country: { type: String, default: 'US' },
    zip: String,
    radius: Number,
    radiusUnit: { type: String, default: 'miles' },
    keywords: [String],              // Location-specific keywords
    landingPage: String,
    gbpConnected: { type: Boolean, default: false },
    gbpId: String,
    localRankings: [{
      keyword: String,
      position: Number,
      mapPackPosition: Number
    }],
    competitors: [{
      name: String,
      gbpRating: Number,
      reviewCount: Number
    }]
  }],
  
  // Competitor Intelligence
  competitors: [{
    domain: String,
    name: String,
    overlapKeywords: [{
      keyword: String,
      ourRank: Number,
      theirRank: Number,
      volume: Number
    }],
    strengthAreas: [String],         // Topics they rank well for
    weaknessAreas: [String],         // Topics we can target
    estimatedTraffic: Number,
    domainAuthority: Number,
    backlinks: Number,
    lastAnalyzed: Date
  }],
  
  // Content Strategy
  contentStrategy: {
    pillarPages: [{
      url: String,
      topic: String,
      clusterIds: [String]           // Related keyword cluster IDs
    }],
    contentCalendar: [{
      topic: String,
      targetKeyword: String,
      suggestedDate: Date,
      status: {
        type: String,
        enum: ['idea', 'planned', 'in_progress', 'published'],
        default: 'idea'
      },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    contentGaps: [{
      topic: String,
      keywords: [String],
      competitorsCovering: [String],
      estimatedTraffic: Number,
      priority: Number
    }]
  },
  
  // Backlink Profile Summary
  backlinkProfile: {
    totalBacklinks: { type: Number, default: 0 },
    referringDomains: { type: Number, default: 0 },
    avgDomainAuthority: { type: Number, default: 0 },
    topReferrers: [{
      domain: String,
      backlinks: Number,
      domainAuthority: Number
    }],
    anchorTextDistribution: [{
      text: String,
      count: Number,
      percentage: Number
    }],
    linkVelocity: {
      last30Days: Number,
      last90Days: Number,
      trend: String
    }
  },
  
  // Graph Relationships (edges)
  relationships: [{
    fromEntity: {
      type: String,                  // 'keyword', 'page', 'location', 'competitor'
      id: String
    },
    toEntity: {
      type: String,
      id: String
    },
    relationshipType: {
      type: String,
      enum: [
        'targets',                   // page targets keyword
        'ranks_for',                 // page ranks for keyword
        'links_to',                  // page links to page
        'competes_with',             // competitor competes for keyword
        'serves',                    // location serves area
        'belongs_to',                // keyword belongs to cluster
        'supports'                   // supporting page supports pillar
      ]
    },
    strength: {                      // 0-100 relationship strength
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // AI-Generated Insights
  insights: {
    opportunities: [{
      id: String,
      type: {
        type: String,
        enum: ['keyword', 'content', 'technical', 'backlink', 'local']
      },
      title: String,
      description: String,
      impact: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      effort: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      relatedEntities: [{
        type: String,
        id: String
      }],
      suggestedActions: [String],
      estimatedTrafficGain: Number,
      priority: Number
    }],
    
    risks: [{
      id: String,
      type: {
        type: String,
        enum: ['ranking_drop', 'technical_issue', 'competitor_threat', 'penalty_risk']
      },
      title: String,
      description: String,
      severity: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low']
      },
      relatedEntities: [{
        type: String,
        id: String
      }],
      mitigationSteps: [String]
    }],
    
    summary: String,                 // AI-generated executive summary
    generatedAt: Date,
    confidence: Number               // 0-100
  },
  
  // Build Status
  buildStatus: {
    lastFullBuild: Date,
    lastIncrementalUpdate: Date,
    status: {
      type: String,
      enum: ['building', 'complete', 'partial', 'error'],
      default: 'partial'
    },
    errors: [String],
    completeness: {                  // % complete per section
      brand: { type: Number, default: 0 },
      keywords: { type: Number, default: 0 },
      pages: { type: Number, default: 0 },
      locations: { type: Number, default: 0 },
      competitors: { type: Number, default: 0 },
      backlinks: { type: Number, default: 0 }
    }
  },
  
  // Version tracking for graph updates
  version: { type: Number, default: 1 }
  
}, {
  timestamps: true
});

// Instance method to add a keyword cluster
seoKnowledgeGraphSchema.methods.addKeywordCluster = function(cluster) {
  cluster.id = cluster.id || new mongoose.Types.ObjectId().toString();
  this.keywordClusters.push(cluster);
  return this.save();
};

// Instance method to update page data
seoKnowledgeGraphSchema.methods.updatePage = function(url, pageData) {
  const existingIndex = this.pages.findIndex(p => p.url === url);
  if (existingIndex >= 0) {
    this.pages[existingIndex] = { ...this.pages[existingIndex].toObject(), ...pageData };
  } else {
    this.pages.push({ url, ...pageData });
  }
  return this.save();
};

// Instance method to add relationship
seoKnowledgeGraphSchema.methods.addRelationship = function(from, to, type, strength = 50) {
  this.relationships.push({
    fromEntity: from,
    toEntity: to,
    relationshipType: type,
    strength
  });
  return this.save();
};

// Static method to get or create graph for client
seoKnowledgeGraphSchema.statics.getOrCreate = async function(clientId) {
  let graph = await this.findOne({ client: clientId });
  if (!graph) {
    graph = await this.create({ 
      client: clientId,
      buildStatus: { status: 'partial' }
    });
  }
  return graph;
};

// Static method to get graph with populated client
seoKnowledgeGraphSchema.statics.getWithClient = async function(clientId) {
  return this.findOne({ client: clientId })
    .populate('client', 'name domain website industry');
};

module.exports = mongoose.model('SEOKnowledgeGraph', seoKnowledgeGraphSchema);
