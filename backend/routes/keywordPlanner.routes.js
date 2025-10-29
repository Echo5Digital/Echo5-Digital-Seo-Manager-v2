const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiService = require('../services/ai.service');

// POST /api/keyword-planner/analyze - Analyze keywords with location
router.post('/analyze', protect, async (req, res, next) => {
  try {
    const { keywords, location, clientId } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Keywords array is required',
      });
    }

    if (!location) {
      return res.status(400).json({
        status: 'error',
        message: 'Location is required',
      });
    }

    console.log(`🔍 Analyzing ${keywords.length} keywords for location: ${location}`);

    // Get keyword planner data from AI service
    const plannerData = await aiService.getKeywordPlannerData(keywords, location);

    console.log(`✅ Keyword planner analysis complete`);

    res.json({
      status: 'success',
      data: plannerData,
    });
  } catch (error) {
    console.error('❌ Keyword planner error:', error);
    next(error);
  }
});

module.exports = router;
