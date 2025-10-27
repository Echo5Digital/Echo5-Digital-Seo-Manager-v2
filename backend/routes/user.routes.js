const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const { protect, authorize } = require('../middleware/auth');

// GET /api/users - Get all users (Boss and Manager)
router.get('/', protect, authorize('Boss', 'Manager'), async (req, res, next) => {
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

// POST /api/users - Create new user (Boss and Manager)
router.post('/', protect, authorize('Boss', 'Manager'), async (req, res, next) => {
  try {
    const { name, email, password, role, assignedClients } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Staff',
      assignedClients: assignedClients || [],
      isActive: true
    });

    // Don't send password back
    const userResponse = await User.findById(user._id).populate('assignedClients', 'name domain');

    res.status(201).json({
      status: 'success',
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id - Update user (Boss and Manager)
router.put('/:id', protect, authorize('Boss', 'Manager'), async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    
    // If password is being updated, it will be hashed by the pre-save hook
    // Remove password from update if it's empty
    if (!updateData.password || updateData.password.trim() === '') {
      delete updateData.password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedClients', 'name domain');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id - Soft delete user (Boss and Manager, but Manager cannot delete Manager/Boss)
router.delete('/:id', protect, authorize('Boss', 'Manager'), async (req, res, next) => {
  try {
    // First, get the user to be deleted
    const userToDelete = await User.findById(req.params.id);
    
    if (!userToDelete) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // If the requester is a Manager, they cannot delete Boss or other Managers
    if (req.user.role === 'Manager' && (userToDelete.role === 'Boss' || userToDelete.role === 'Manager')) {
      return res.status(403).json({
        status: 'error',
        message: 'Managers cannot delete Boss or other Managers'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    res.json({
      status: 'success',
      message: 'User deleted successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
