const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

// GET /api/auth/google - Initiate Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));

// GET /api/auth/google/callback - Google OAuth callback
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        console.error('Google OAuth error:', err);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
      }
      
      if (!user) {
        // User was rejected (e.g., unauthorized email domain)
        const message = info?.message || 'Authentication failed';
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=unauthorized_domain&message=${encodeURIComponent(message)}`);
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/login?token=${token}&googleAuth=success`);
    })(req, res, next);
  }
);

module.exports = router;
