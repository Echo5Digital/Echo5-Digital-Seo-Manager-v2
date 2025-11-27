const express = require('express');
const router = express.Router();
const Task = require('../models/Task.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const emailService = require('../services/email.service');
const aiService = require('../services/ai.service');
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

    await task.populate('clientId', 'name domain');
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    // Create notification for assigned user
    if (task.assignedTo && task.assignedTo._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        userId: task.assignedTo._id,
        type: 'Task Assigned',
        title: 'New Task Assigned',
        message: `You have been assigned: ${task.title}`,
        priority: task.priority === 'High' || task.priority === 'Critical' ? 'High' : 'Medium',
        relatedModel: 'Task',
        relatedId: task._id,
        actionUrl: '/tasks',
      });

      // Send email notification to assigned staff
      try {
        await emailService.sendTaskAssignedEmail(
          task.assignedTo,
          task,
          req.user
        );
      } catch (error) {
        console.error('Failed to send task assignment email:', error);
        // Don't fail the request if email fails
      }
    }

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

    // Track status change for notifications
    const oldStatus = task.status;
    const statusChanged = req.body.status && req.body.status !== oldStatus;

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
    await task.populate('createdBy', 'name email');

    // Track changes for email notification
    const changes = [];
    if (statusChanged) {
      changes.push({ field: 'Status', from: oldStatus, to: task.status });
    }

    // Create notification for status changes
    if (statusChanged) {
      // If staff member changes status, notify admin (createdBy)
      if (req.user.role === 'Staff' && task.createdBy && task.createdBy._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          userId: task.createdBy._id,
          type: 'Task Update',
          title: 'Task Status Updated',
          message: `${req.user.name} changed task "${task.title}" status from ${oldStatus} to ${task.status}`,
          priority: task.status === 'Completed' ? 'Low' : 'Medium',
          relatedModel: 'Task',
          relatedId: task._id,
          actionUrl: '/tasks',
        });

        // Send email to admin about task update
        try {
          await emailService.sendTaskUpdateEmail(
            task.createdBy,
            task,
            req.user,
            changes
          );
        } catch (error) {
          console.error('Failed to send task update email to admin:', error);
        }
      }
      
      // If admin changes status, notify assigned staff member
      if ((req.user.role === 'Boss' || req.user.role === 'Manager') && task.assignedTo && task.assignedTo._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          userId: task.assignedTo._id,
          type: 'Task Update',
          title: 'Task Status Updated',
          message: `${req.user.name} changed your task "${task.title}" status to ${task.status}`,
          priority: task.status === 'Cancelled' ? 'High' : 'Medium',
          relatedModel: 'Task',
          relatedId: task._id,
          actionUrl: '/tasks',
        });

        // Send email to staff about status change
        try {
          await emailService.sendTaskStatusChangeEmail(
            task.assignedTo,
            task,
            oldStatus,
            task.status,
            req.user
          );
        } catch (error) {
          console.error('Failed to send status change email to staff:', error);
        }
      }
    }

    res.json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - Delete task (Boss/Manager/Admin only)
router.delete('/:id', protect, authorize('Boss', 'Manager', 'Admin'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Task deleted successfully',
      data: { taskId: req.params.id },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/suggest-fix - Generate AI fix suggestion for an SEO issue
router.post('/suggest-fix', protect, async (req, res, next) => {
  try {
    const { issueType, issueDetails } = req.body;

    if (!issueType) {
      return res.status(400).json({
        status: 'error',
        message: 'Issue type is required',
      });
    }

    // Generate AI fix suggestion
    const suggestion = await aiService.generateFixSuggestion(issueType, issueDetails);

    res.json({
      status: 'success',
      data: { suggestion },
    });
  } catch (error) {
    console.error('AI suggestion error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate AI suggestion',
    });
  }
});

module.exports = router;
