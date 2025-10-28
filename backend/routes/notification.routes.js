const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification.model');
const emailService = require('../services/email.service');
const { protect, authorize } = require('../middleware/auth');

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

// POST /api/notifications/test-email - Test email functionality (admin only)
router.post('/test-email', protect, authorize('Boss', 'Manager'), async (req, res, next) => {
  try {
    const result = await emailService.sendEmail({
      to: req.user.email,
      subject: 'Test Email - Echo5 SEO Operations',
      text: 'This is a test email from Echo5 SEO Operations platform.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #667eea;">✅ Email Test Successful!</h2>
          <p>Hi <strong>${req.user.name}</strong>,</p>
          <p>This is a test email from the Echo5 SEO Operations platform.</p>
          <p>If you're seeing this, it means email notifications are working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated test message from Echo5 SEO Operations Platform.
          </p>
        </div>
      `,
    });

    res.json({
      status: 'success',
      message: 'Test email sent',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

