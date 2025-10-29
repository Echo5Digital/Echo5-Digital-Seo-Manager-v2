const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User.model');
const jwt = require('jsonwebtoken');

// Configure Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Google OAuth Profile:', profile.id, profile.displayName, profile.emails[0].value);

        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if email already exists (regular account)
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.picture = profile.photos[0]?.value;
            await user.save();
            console.log('✅ Linked Google account to existing user:', user.email);
          } else {
            // Create new user with Staff role by default
            user = await User.create({
              name: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
              picture: profile.photos[0]?.value,
              role: 'Staff', // Auto-assign as Staff
              password: Math.random().toString(36).slice(-12), // Random password (won't be used)
            });
            console.log('✅ Created new Staff user via Google:', user.email);
          }
        }

        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth Error:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// GET /api/auth/google - Initiate Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));

// GET /api/auth/google/callback - Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    session: false 
  }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/login?token=${token}&googleAuth=success`);
  }
);

module.exports = router;
