const mongoose = require('mongoose');

const rankHistorySchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    trim: true
  },
  keyword: {
    type: String,
    required: true,
    trim: true
  },
  rank: {
    type: Number,
    default: null // null if not found in top 100
  },
  inTop100: {
    type: Boolean,
    default: false
  },
  difficulty: {
    type: Number,
    default: null
  },
  location: {
    type: String,
    required: true
  },
  locationCode: {
    type: Number,
    required: false, // Optional - Oxylabs uses location names instead of codes
    default: null
  },
  source: {
    type: String,
    enum: ['dataforseo', 'oxylabs', 'manual'],
    default: 'dataforseo'
  },
  checkedAt: {
    type: Date,
    default: Date.now
  },
  // Month and year for easier grouping
  month: {
    type: Number, // 1-12
    required: true
  },
  year: {
    type: Number, // e.g., 2025
    required: true
  },
  // Previous rank for comparison
  previousRank: {
    type: Number,
    default: null
  },
  rankChange: {
    type: Number, // positive = improved (moved up), negative = declined (moved down)
    default: null
  },
  // Optional: link to client if this is tracked for a specific client
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  // Optional: link to keyword record
  keywordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Keyword',
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
rankHistorySchema.index({ domain: 1, keyword: 1, checkedAt: -1 });
rankHistorySchema.index({ client: 1, checkedAt: -1 });
rankHistorySchema.index({ checkedAt: -1 });
rankHistorySchema.index({ year: 1, month: 1, domain: 1 });
rankHistorySchema.index({ keywordId: 1, year: 1, month: 1 });

module.exports = mongoose.model('RankHistory', rankHistorySchema);
