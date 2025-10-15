const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const { protect, authorize } = require('../middleware/auth');

// GET /api/users - Get all users (Boss only)
router.get('/', protect, authorize('Boss'), async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .populate('assignedClients', 'name domain')
      .sort('name');

    res.json({
      status: 'success',
      results: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id - Update user (Boss only)
router.put('/:id', protect, authorize('Boss'), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
