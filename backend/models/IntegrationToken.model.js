const mongoose = require('mongoose');

/**
 * @typedef {Object} IntegrationToken
 * @property {ObjectId} userId - User who connected the integration
 * @property {string} provider - Integration provider (google_gbp, etc.)
 * @property {string} refreshToken - OAuth refresh token
 * @property {string[]} scope - OAuth scopes granted
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

const integrationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  provider: {
    type: String,
    enum: ['google_gbp'],
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  scope: {
    type: [String],
    default: [],
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Ensure unique token per user per provider
integrationTokenSchema.index({ userId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('IntegrationToken', integrationTokenSchema);
