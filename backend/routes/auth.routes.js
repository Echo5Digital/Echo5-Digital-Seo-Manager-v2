const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const User = require('../models/User.model');
const { protect, authorize, generateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Private (Boss only)
 */
router.post(
  '/register',
  protect,
  authorize('Boss'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['Boss', 'Staff', 'Developer']).withMessage('Invalid role'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'User with this email already exists',
        });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        role,
      });

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user and include password
      const user = await User.findOne({ email }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          status: 'error',
          message: 'Account is deactivated',
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user._id);

      res.json({
        status: 'success',
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  res.json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
});

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/update-profile',
  protect,
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('picture').optional().isURL().withMessage('Picture must be a valid URL'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, avatar, picture } = req.body;
      
      const updateFields = {};
      if (name) updateFields.name = name;
      if (email) updateFields.email = email;
      if (avatar) updateFields.avatar = avatar;
      if (picture) updateFields.picture = picture;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updateFields,
        { new: true, runValidators: true }
      );

      res.json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select('+password');

      if (!(await user.comparePassword(currentPassword))) {
        return res.status(401).json({
          status: 'error',
          message: 'Current password is incorrect',
        });
      }

      user.password = newPassword;
      await user.save();

      res.json({
        status: 'success',
        message: 'Password updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
