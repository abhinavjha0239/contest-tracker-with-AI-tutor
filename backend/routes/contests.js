// routes/contests.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Contest = require('../models/Contest');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/contests/upcoming
// @desc    Get upcoming contests
// @access  Public (bookmarked status requires auth)
router.get('/upcoming', async (req, res) => {
  try {
    const { platforms } = req.query;
    const filter = { startTime: { $gt: new Date() } };
    
    if (platforms) {
      filter.platform = { $in: platforms.split(',') };
    }
    
    const contests = await Contest.find(filter).sort({ startTime: 1 });
    let user = null;

    // Check for authenticated user
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        user = await User.findById(decoded.id);
      } catch (err) {
        // Token error, continue without user
      }
    }

    const bookmarked = user ? user.bookmarkedContests.map(id => id.toString()) : [];
    const response = contests.map(contest => ({
      ...contest.toObject(),
      bookmarked: bookmarked.includes(contest._id.toString())
    }));
    
    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/contests/past
// @desc    Get past contests
// @access  Public (bookmarked status requires auth)
router.get('/past', async (req, res) => {
  try {
    const { platforms, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { endTime: { $lt: new Date() } };
    if (platforms) {
      filter.platform = { $in: platforms.split(',') };
    }
    
    const [contests, total] = await Promise.all([
      Contest.find(filter)
        .sort({ endTime: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Contest.countDocuments(filter)
    ]);
    
    // Check for bookmarks if user is authenticated
    let bookmarkedIds = [];
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          bookmarkedIds = user.bookmarkedContests.map(id => id.toString());
        }
      } catch (err) {
        // Token error, continue without bookmarks
      }
    }
    
    const response = {
      contests: contests.map(contest => ({
        ...contest.toObject(),
        bookmarked: bookmarkedIds.includes(contest._id.toString())
      })),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    };
    
    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;