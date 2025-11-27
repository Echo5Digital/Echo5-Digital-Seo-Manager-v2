const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Chat Message Schema - Individual message in a conversation
 */
const ChatMessageSchema = new Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  inputType: {
    type: String,
    enum: ['text', 'voice', 'button'],
    default: 'text'
  },
  // Action buttons to show with this message
  buttons: [{
    label: String,
    action: String,
    style: {
      type: String,
      enum: ['primary', 'success', 'warning', 'danger', 'secondary', 'outline'],
      default: 'primary'
    }
  }],
  // Follow-up suggestions
  followUps: [String],
  // If AI called a function
  functionCall: {
    name: String,
    arguments: Schema.Types.Mixed,
    result: Schema.Types.Mixed
  },
  // Metadata
  tokenCount: {
    type: Number,
    default: 0
  },
  feedback: {
    type: String,
    enum: ['positive', 'negative', null],
    default: null
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

/**
 * Chat Session Schema - A conversation (one per day per user)
 */
const ChatSessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Date string for easy querying (YYYY-MM-DD)
  date: {
    type: String,
    required: true,
    index: true
  },
  // Auto-generated from first meaningful message
  title: {
    type: String,
    default: 'New Conversation'
  },
  // All messages in this session
  messages: [ChatMessageSchema],
  // Compressed summary for token optimization
  summary: {
    type: String,
    default: ''
  },
  // Total tokens used in this session
  totalTokens: {
    type: Number,
    default: 0
  },
  // Session status
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  // Context - which page/client user was viewing
  context: {
    currentPage: String,
    currentClientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client'
    },
    currentPageId: {
      type: Schema.Types.ObjectId,
      ref: 'Page'
    }
  }
}, {
  timestamps: true
});

// Compound index for fast user+date queries
ChatSessionSchema.index({ userId: 1, date: -1 });

// Static method to get or create today's session
ChatSessionSchema.statics.getOrCreateToday = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  let session = await this.findOne({ userId, date: today });
  
  if (!session) {
    session = await this.create({
      userId,
      date: today,
      title: 'New Conversation',
      messages: []
    });
  }
  
  return session;
};

// Static method to get session history for a user
ChatSessionSchema.statics.getHistory = async function(userId, limit = 30) {
  return this.find({ userId })
    .select('date title status totalTokens createdAt')
    .sort({ date: -1 })
    .limit(limit);
};

// Instance method to add a message
ChatSessionSchema.methods.addMessage = async function(message) {
  this.messages.push(message);
  this.totalTokens += message.tokenCount || 0;
  
  // Auto-generate title from first user message
  if (this.title === 'New Conversation' && message.role === 'user') {
    const content = message.content.slice(0, 50);
    this.title = content + (message.content.length > 50 ? '...' : '');
  }
  
  return this.save();
};

// Instance method to get recent messages for context
ChatSessionSchema.methods.getRecentMessages = function(limit = 20) {
  return this.messages.slice(-limit);
};

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
