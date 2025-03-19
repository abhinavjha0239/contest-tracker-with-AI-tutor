// routes/admin.js
const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const { authenticate, isAdmin } = require('../middleware/auth');

// @route   POST /api/admin/link-youtube
// @desc    Add YouTube link to a contest
// @access  Private (Admin only)
router.post('/link-youtube', authenticate, isAdmin, async (req, res) => {
  try {
    const { contestId, youtubeLink } = req.body;
    
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }
    
    contest.youtubeLink = youtubeLink;
    await contest.save();
    
    res.json({ msg: 'YouTube link added successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/admin/contests
// @desc    Get all contests (for admin dashboard)
// @access  Private (Admin only)
router.get('/contests', authenticate, isAdmin, async (req, res) => {
  try {
    const contests = await Contest.find().sort({ startTime: -1 });
    res.json(contests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;