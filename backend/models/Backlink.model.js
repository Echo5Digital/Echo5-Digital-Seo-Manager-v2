const mongoose = require('mongoose');

/**
 * @typedef {Object} Backlink
 * @property {ObjectId} clientId - Reference to Client
 * @property {string} sourceUrl - URL where backlink exists
 * @property {string} targetUrl - Client URL being linked to
 * @property {string} anchorText - Anchor text used
 * @property {string} status - Backlink status
 * @property {string} type - Dofollow or Nofollow
 * @property {Object} metrics - Domain metrics
 * @property {Date} createdAt
 */

const backlinkSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  sourceUrl: {
    type: String,
    required: [true, 'Source URL is required'],
    trim: true,
  },
  sourceDomain: {
    type: String,
    required: true,
  },
  targetUrl: {
    type: String,
    required: [true, 'Target URL is required'],
    trim: true,
  },
  anchorText: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Requested', 'Pending', 'Live', 'Broken', 'Removed', 'Rejected'],
    default: 'Requested',
  },
  type: {
    type: String,
    enum: ['Dofollow', 'Nofollow'],
    default: 'Dofollow',
  },
  metrics: {
    domainAuthority: Number,
    pageAuthority: Number,
    spamScore: Number,
    trustFlow: Number,
    citationFlow: Number,
  },
  outreachStatus: {
    contacted: {
      type: Boolean,
      default: false,
    },
    contactedDate: Date,
    response: String,
    followUpCount: {
      type: Number,
      default: 0,
    },
    lastFollowUp: Date,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: String,
  lastChecked: Date,
  discoveredDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
backlinkSchema.index({ clientId: 1, status: 1 });
backlinkSchema.index({ sourceDomain: 1 });

module.exports = mongoose.model('Backlink', backlinkSchema);
