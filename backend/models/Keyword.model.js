const mongoose = require('mongoose');

/**
 * @typedef {Object} Keyword
 * @property {ObjectId} clientId - Reference to Client
 * @property {string} keyword - The keyword phrase
 * @property {number} volume - Monthly search volume
 * @property {string} competition - Low, Medium, High
 * @property {number} cpc - Cost per click
 * @property {string} intent - Search intent type
 * @property {string[]} tags - Custom tags
 * @property {Object} rankTracking - Current and historical rankings
 * @property {Object} aiAnalysis - AI-generated insights
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

const keywordSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  keyword: {
    type: String,
    required: [true, 'Keyword is required'],
    trim: true,
  },
  volume: {
    type: Number,
    default: 0,
  },
  competition: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  cpc: {
    type: Number,
    default: 0,
  },
  intent: {
    type: String,
    enum: ['Informational', 'Navigational', 'Commercial', 'Transactional'],
    default: 'Informational',
  },
  tags: [{
    type: String,
    enum: ['Priority', 'Seasonal', 'Campaign', 'Experimental', 'Long-tail', 'Brand'],
  }],
  rankTracking: {
    currentRank: {
      type: Number,
      default: null,
    },
    previousRank: {
      type: Number,
      default: null,
    },
    bestRank: {
      type: Number,
      default: null,
    },
    lastChecked: {
      type: Date,
    },
    history: [{
      rank: Number,
      date: {
        type: Date,
        default: Date.now,
      },
      url: String,
    }],
    trend: {
      type: String,
      enum: ['up', 'down', 'stable', 'new'],
      default: 'new',
    },
  },
  competitors: [{
    domain: String,
    rank: Number,
    lastChecked: Date,
  }],
  targetUrl: {
    type: String,
    trim: true,
  },
  aiAnalysis: {
    difficulty: {
      type: Number,
      min: 0,
      max: 100,
    },
    suggestions: String,
    topicalCluster: String,
    lastAnalyzed: Date,
  },
  status: {
    type: String,
    enum: ['Active', 'Paused', 'Archived'],
    default: 'Active',
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes for performance
keywordSchema.index({ clientId: 1, keyword: 1 }, { unique: true });
keywordSchema.index({ 'rankTracking.currentRank': 1 });
keywordSchema.index({ tags: 1 });
keywordSchema.index({ status: 1 });

module.exports = mongoose.model('Keyword', keywordSchema);
