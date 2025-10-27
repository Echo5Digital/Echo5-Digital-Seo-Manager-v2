const express = require('express');
const router = express.Router();
const Task = require('../models/Task.model');
const { protect, authorize } = require('../middleware/auth');

// GET /api/tasks - Get tasks (filtered by user role)
router.get('/', protect, async (req, res, next) => {
  try {
    let query = {};
    
    if (req.user.role === 'Staff') {
      query.assignedTo = req.user._id;
    }

    const { clientId, status } = req.query;
    if (clientId) query.clientId = clientId;
    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate('clientId', 'name domain')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort('-createdAt');

    res.json({
      status: 'success',
      results: tasks.length,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks - Create task
router.post('/', protect, async (req, res, next) => {
  try {
    const task = await Task.create({
      ...req.body,
      createdBy: req.user._id,
      logs: [{
        action: 'Task created',
        userId: req.user._id,
        timestamp: new Date(),
      }],
    });

    res.status(201).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    Object.assign(task, req.body);
    
    task.logs.push({
      action: `Task updated: ${req.body.status || 'details changed'}`,
      userId: req.user._id,
      timestamp: new Date(),
    });

    await task.save();

    // Populate the task with related data before returning
    await task.populate('clientId', 'name domain');
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name');

    res.json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
