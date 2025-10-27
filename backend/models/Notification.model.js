const mongoose = require('mongoose');

/**
 * @typedef {Object} Notification
 * @property {ObjectId} userId - User to notify
 * @property {string} type - Notification type
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {boolean} read - Read status
 * @property {ObjectId} relatedId - Related entity ID
 * @property {Date} createdAt
 */

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'Rank Drop',
      'Rank Gain',
      'Audit Complete',
      'Task Assigned',
      'Task Update',
      'Task Overdue',
      'Approval Required',
      'Backlink Live',
      'Backlink Broken',
      'Alert',
      'System',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  read: {
    type: Boolean,
    default: false,
  },
  relatedModel: {
    type: String,
    enum: ['Client', 'Task', 'Keyword', 'Audit', 'Backlink'],
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  actionUrl: {
    type: String,
  },
  readAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

module.exports = mongoose.model('Notification', notificationSchema);
