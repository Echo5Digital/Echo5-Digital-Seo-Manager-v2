const express = require('express');
const router = express.Router();
const Keyword = require('../models/Keyword.model');
const { protect } = require('../middleware/auth');
const aiService = require('../services/ai.service');

// GET /api/keywords - Get keywords for a client
router.get('/', protect, async (req, res, next) => {
  try {
    const { clientId } = req.query;
    const filter = { status: 'Active' };
    
    // Only filter by clientId if provided
    if (clientId) {
      filter.clientId = clientId;
    }
    
    const keywords = await Keyword.find(filter)
      .populate('clientId', 'name domain')
      .sort('-createdAt');

    res.json({
      status: 'success',
      results: keywords.length,
      data: { keywords },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/keywords - Add new keyword
router.post('/', protect, async (req, res, next) => {
  try {
    const keyword = await Keyword.create({
      ...req.body,
      addedBy: req.user._id,
    });

    res.status(201).json({
      status: 'success',
      data: { keyword },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/keywords/analyze - AI analyze keyword
router.post('/analyze/:id', protect, async (req, res, next) => {
  try {
    const keyword = await Keyword.findById(req.params.id);
    const analysis = await aiService.analyzeKeywordDifficulty(keyword.keyword);
    
    keyword.aiAnalysis = analysis;
    await keyword.save();

    res.json({
      status: 'success',
      data: { keyword },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
