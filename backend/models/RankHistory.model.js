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
    required: true
  },
  source: {
    type: String,
    enum: ['dataforseo', 'manual'],
    default: 'dataforseo'
  },
  checkedAt: {
    type: Date,
    default: Date.now
  },
  // Optional: link to client if this is tracked for a specific client
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
rankHistorySchema.index({ domain: 1, keyword: 1, checkedAt: -1 });
rankHistorySchema.index({ client: 1, checkedAt: -1 });
rankHistorySchema.index({ checkedAt: -1 });

module.exports = mongoose.model('RankHistory', rankHistorySchema);
