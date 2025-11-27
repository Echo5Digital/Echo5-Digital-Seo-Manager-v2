const express = require('express');
const router = express.Router();
const ChatSession = require('../models/ChatSession.model');
const chatService = require('../services/chat.service');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/chat/session
 * @desc    Get or create today's chat session
 * @access  Private
 */
router.get('/session', protect, async (req, res, next) => {
  try {
    const session = await ChatSession.getOrCreateToday(req.user._id);
    
    // If new session, add welcome message
    if (session.messages.length === 0) {
      const welcomeMessage = chatService.getWelcomeMessage(req.user);
      session.messages.push(welcomeMessage);
      await session.save();
    }

    res.json({
      status: 'success',
      data: {
        session: {
          id: session._id,
          date: session.date,
          title: session.title,
          messages: session.messages,
          totalTokens: session.totalTokens
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/chat/history
 * @desc    Get chat history (past sessions)
 * @access  Private
 */
router.get('/history', protect, async (req, res, next) => {
  try {
    const { limit = 30 } = req.query;
    
    const sessions = await ChatSession.getHistory(req.user._id, parseInt(limit));

    res.json({
      status: 'success',
      data: {
        sessions: sessions.map(s => ({
          id: s._id,
          date: s.date,
          title: s.title,
          status: s.status,
          tokenCount: s.totalTokens
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/chat/session/:id
 * @desc    Get a specific session by ID
 * @access  Private
 */
router.get('/session/:id', protect, async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        session: {
          id: session._id,
          date: session.date,
          title: session.title,
          messages: session.messages,
          totalTokens: session.totalTokens
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/chat/message
 * @desc    Send a message and get AI response
 * @access  Private
 */
router.post('/message', protect, async (req, res, next) => {
  try {
    const { message, inputType = 'text', context = {} } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required'
      });
    }

    // Get or create today's session
    const session = await ChatSession.getOrCreateToday(req.user._id);

    // Add user message
    const userMessage = {
      role: 'user',
      content: message.trim(),
      inputType,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    // Update session context
    if (context.currentPage || context.currentClientId) {
      session.context = {
        ...session.context,
        ...context
      };
    }

    // Get recent messages for context (limit to save tokens)
    const conversationHistory = session.getRecentMessages(10);

    // Process message with AI
    const response = await chatService.processMessage(
      message,
      req.user,
      conversationHistory,
      session.context
    );

    // Add AI response to session
    const assistantMessage = {
      role: 'assistant',
      content: response.content,
      buttons: response.buttons,
      followUps: response.followUps,
      functionCall: response.functionCall,
      tokenCount: response.tokenCount,
      timestamp: new Date()
    };
    session.messages.push(assistantMessage);

    // Update total tokens
    session.totalTokens += response.tokenCount;

    // Save session
    await session.save();

    res.json({
      status: 'success',
      data: {
        message: assistantMessage,
        sessionId: session._id,
        totalTokens: session.totalTokens
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/chat/feedback
 * @desc    Submit feedback for a message
 * @access  Private
 */
router.post('/feedback', protect, async (req, res, next) => {
  try {
    const { sessionId, messageIndex, feedback } = req.body;

    if (!['positive', 'negative'].includes(feedback)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid feedback value'
      });
    }

    const session = await ChatSession.findOne({
      _id: sessionId,
      userId: req.user._id
    });

    if (!session || !session.messages[messageIndex]) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    session.messages[messageIndex].feedback = feedback;
    await session.save();

    res.json({
      status: 'success',
      message: 'Feedback recorded'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/chat/pin
 * @desc    Pin/unpin a message
 * @access  Private
 */
router.post('/pin', protect, async (req, res, next) => {
  try {
    const { sessionId, messageIndex, pinned } = req.body;

    const session = await ChatSession.findOne({
      _id: sessionId,
      userId: req.user._id
    });

    if (!session || !session.messages[messageIndex]) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    session.messages[messageIndex].isPinned = pinned;
    await session.save();

    res.json({
      status: 'success',
      message: pinned ? 'Message pinned' : 'Message unpinned'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/chat/history
 * @desc    Clear chat history (keep today's session)
 * @access  Private
 */
router.delete('/history', protect, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await ChatSession.deleteMany({
      userId: req.user._id,
      date: { $ne: today }
    });

    res.json({
      status: 'success',
      message: 'Chat history cleared'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/chat/search
 * @desc    Search in chat history
 * @access  Private
 */
router.get('/search', protect, async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query must be at least 2 characters'
      });
    }

    const sessions = await ChatSession.find({
      userId: req.user._id,
      'messages.content': new RegExp(q, 'i')
    })
      .select('date title messages')
      .limit(parseInt(limit));

    // Extract matching messages
    const results = [];
    for (const session of sessions) {
      for (let i = 0; i < session.messages.length; i++) {
        const msg = session.messages[i];
        if (msg.content && msg.content.match(new RegExp(q, 'i'))) {
          results.push({
            sessionId: session._id,
            sessionDate: session.date,
            sessionTitle: session.title,
            messageIndex: i,
            role: msg.role,
            content: msg.content.substring(0, 200),
            timestamp: msg.timestamp
          });
        }
      }
    }

    res.json({
      status: 'success',
      data: {
        count: results.length,
        results: results.slice(0, parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
