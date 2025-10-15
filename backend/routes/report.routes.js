const express = require('express');
const router = express.Router();
const Report = require('../models/Report.model');
const { protect } = require('../middleware/auth');

// GET /api/reports/:clientId - Get reports for client
router.get('/:clientId', protect, async (req, res, next) => {
  try {
    const reports = await Report.find({ clientId: req.params.clientId })
      .sort('-createdAt');

    res.json({
      status: 'success',
      results: reports.length,
      data: { reports },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reports/generate - Generate new report
router.post('/generate', protect, async (req, res, next) => {
  try {
    const { clientId, reportType, startDate, endDate } = req.body;

    // Create report (data aggregation would happen here)
    const report = await Report.create({
      clientId,
      reportType,
      period: { startDate, endDate },
      createdBy: req.user._id,
      data: {}, // Would be populated with actual data
    });

    res.status(201).json({
      status: 'success',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
