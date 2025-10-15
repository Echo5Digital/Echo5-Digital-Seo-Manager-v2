const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification.model');
const { protect } = require('../middleware/auth');

// GET /api/notifications - Get user notifications
router.get('/', protect, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort('-createdAt')
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });

    res.json({
      status: 'success',
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    res.json({
      status: 'success',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
