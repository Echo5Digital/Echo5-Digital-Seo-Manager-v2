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
    const keywordData = {
      ...req.body,
      addedBy: req.user._id,
    };

    // If volume, competition, or intent are not provided, fetch them automatically
    const needsStats = !req.body.volume || !req.body.competition || !req.body.intent;
    
    if (needsStats && req.body.keyword) {
      console.log(`🔍 Fetching keyword stats for: "${req.body.keyword}"`);
      try {
        const stats = await aiService.getKeywordStats(req.body.keyword);
        
        // Only set values if they weren't provided in the request
        if (!keywordData.volume) keywordData.volume = stats.volume;
        if (!keywordData.competition) keywordData.competition = stats.competition;
        if (!keywordData.intent) keywordData.intent = stats.intent;
        
        console.log(`✅ Keyword stats fetched:`, {
          volume: stats.volume,
          competition: stats.competition,
          intent: stats.intent,
        });
      } catch (error) {
        console.error('⚠️ Failed to fetch keyword stats:', error.message);
        // Continue with creation even if stats fetch fails
      }
    }

    const keyword = await Keyword.create(keywordData);

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

// POST /api/keywords/refresh-stats/:id - Refresh keyword stats
router.post('/refresh-stats/:id', protect, async (req, res, next) => {
  try {
    const keyword = await Keyword.findById(req.params.id);
    
    if (!keyword) {
      return res.status(404).json({
        status: 'error',
        message: 'Keyword not found',
      });
    }

    console.log(`🔄 Refreshing stats for keyword: "${keyword.keyword}"`);
    const stats = await aiService.getKeywordStats(keyword.keyword);
    
    // Update keyword with new stats
    keyword.volume = stats.volume;
    keyword.competition = stats.competition;
    keyword.intent = stats.intent;
    await keyword.save();

    console.log(`✅ Stats refreshed for "${keyword.keyword}":`, {
      volume: stats.volume,
      competition: stats.competition,
      intent: stats.intent,
    });

    res.json({
      status: 'success',
      data: { keyword },
      message: 'Keyword stats refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
