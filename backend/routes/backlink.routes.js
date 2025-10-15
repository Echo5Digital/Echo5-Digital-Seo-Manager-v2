const express = require('express');
const router = express.Router();
const Backlink = require('../models/Backlink.model');
const { protect } = require('../middleware/auth');

// GET /api/backlinks/:clientId - Get backlinks for client
router.get('/:clientId', protect, async (req, res, next) => {
  try {
    const backlinks = await Backlink.find({ clientId: req.params.clientId })
      .sort('-createdAt');

    res.json({
      status: 'success',
      results: backlinks.length,
      data: { backlinks },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/backlinks - Add new backlink
router.post('/', protect, async (req, res, next) => {
  try {
    const backlink = await Backlink.create({
      ...req.body,
      addedBy: req.user._id,
    });

    res.status(201).json({
      status: 'success',
      data: { backlink },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
