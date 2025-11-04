const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIO = require('socket.io');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// Import logger first (needed for Passport config)
const { logger } = require('./utils/logger');

// Configure Passport Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const User = require('./models/User.model');
  
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          logger.info('🔐 Google OAuth Profile:', { id: profile.id, name: profile.displayName, email: profile.emails[0].value });

          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
              user.googleId = profile.id;
              user.picture = profile.photos[0]?.value;
              await user.save();
              logger.info('✅ Linked Google account to existing user:', user.email);
            } else {
              user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                picture: profile.photos[0]?.value,
                role: 'Staff',
                password: Math.random().toString(36).slice(-12),
              });
              logger.info('✅ Created new Staff user via Google:', user.email);
            }
          }

          return done(null, user);
        } catch (error) {
          logger.error('❌ Google OAuth Error:', error);
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const User = require('./models/User.model');
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  logger.info('✅ Google OAuth strategy configured');
} else {
  logger.warn('⚠️  Google OAuth credentials not configured. Google Sign-In will be disabled.');
}

// Import routes
const authRoutes = require('./routes/auth.routes');
const googleAuthRoutes = require('./routes/googleAuth.routes');
const clientRoutes = require('./routes/client.routes');
const keywordRoutes = require('./routes/keyword.routes');
const keywordPlannerRoutes = require('./routes/keywordPlanner.routes');
const taskRoutes = require('./routes/task.routes');
const auditRoutes = require('./routes/audit.routes');
const reportRoutes = require('./routes/report.routes');
const backlinkRoutes = require('./routes/backlink.routes');
const userRoutes = require('./routes/user.routes');
const notificationRoutes = require('./routes/notification.routes');
const pageRoutes = require('./routes/page.routes');
const blogRoutes = require('./routes/blog.routes');
const integrationRoutes = require('./routes/integration.routes');

// Import services
const emailService = require('./services/email.service');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import jobs
const { initScheduler } = require('./jobs/scheduler');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with dynamic CORS including local network
const io = socketIO(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://echo5-digital-seo-ops-v2.vercel.app',
        'https://echo5-digital-seo-ops-v2-1pany1sa7-manu-amarnaths-projects.vercel.app',
        process.env.FRONTEND_URL,
      ].filter(Boolean);
      
      if (!origin || 
          allowedOrigins.indexOf(origin) !== -1 || 
          (origin && origin.includes('.vercel.app')) ||
          (origin && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Trust proxy - Required for deployment on Render, Heroku, etc.
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

// Rate limiting - DISABLED FOR DEVELOPMENT
// ⚠️ WARNING: Enable this in production to prevent abuse!
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
//   message: 'Too many requests from this IP, please try again later.',
// });
// app.use('/api/', limiter);

// CORS - Allow multiple origins including local network
const allowedOrigins = [
  'http://localhost:3000',
  'https://echo5-digital-seo-ops-v2.vercel.app',
  'https://echo5-digital-seo-ops-v2-1pany1sa7-manu-amarnaths-projects.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or is a Vercel preview URL or local network
    if (allowedOrigins.indexOf(origin) !== -1 || 
        (origin && origin.includes('.vercel.app')) ||
        (origin && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Initialize Passport
app.use(passport.initialize());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('✅ MongoDB connected successfully');
    // Initialize scheduler after DB connection
    initScheduler();
  })
  .catch((err) => {
    logger.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', googleAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/keyword-planner', keywordPlannerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backlinks', backlinkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/integrations', integrationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all network interfaces
server.listen(PORT, HOST, async () => {
  logger.info(`🚀 Server running on ${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(`📱 Network access: http://<your-local-ip>:${PORT}`);
  
  // Verify SMTP connection
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const smtpConnected = await emailService.verifyConnection();
    if (smtpConnected) {
      logger.info('✅ SMTP connection verified - Email notifications enabled');
    } else {
      logger.warn('⚠️  SMTP connection failed - Email notifications disabled');
    }
  } else {
    logger.warn('⚠️  SMTP credentials not configured - Email notifications disabled');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Rejection (non-fatal):', err.message || err);
  // Don't exit - just log the error and continue
  // This allows audits to complete even if some promises fail
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  // Only exit on truly critical errors, not audit-related timeouts
  if (err.message && err.message.includes('ECONNREFUSED')) {
    // Database connection issues - should exit
    process.exit(1);
  }
  // Otherwise, log and continue
});

module.exports = { app, server, io };
