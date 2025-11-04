const mongoose = require('mongoose');

/**
 * @typedef {Object} Task
 * @property {ObjectId} clientId - Reference to Client
 * @property {string} title - Task title
 * @property {string} description - Task description
 * @property {string} type - Task type/category
 * @property {string} priority - Task priority level
 * @property {string} status - Current status
 * @property {ObjectId} assignedTo - Assigned staff member
 * @property {ObjectId} createdBy - Task creator
 * @property {Object} aiSuggestion - AI-generated fix suggestions
 * @property {Date} dueDate - Task deadline
 * @property {Array} logs - Activity logs
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

const taskSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'Site Audit Fix',
      'Content Optimization',
      'Content Writing',
      'Blog Writing',
      'Keyword Research',
      'Backlink Outreach',
      'Technical SEO',
      'Schema Markup',
      'Internal Linking',
      'Meta Update',
      'Alt Text',
      'Page Speed',
      'Other',
    ],
    required: true,
  },
  priority: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Review', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  aiSuggestion: {
    recommendation: String,
    reasoning: String,
    estimatedImpact: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
    },
    generatedAt: Date,
  },
  relatedUrl: {
    type: String,
  },
  timeEstimate: {
    type: Number, // in minutes
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0,
  },
  dueDate: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  logs: [{
    action: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    notes: String,
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Indexes
taskSchema.index({ clientId: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ priority: 1, dueDate: 1 });
taskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
