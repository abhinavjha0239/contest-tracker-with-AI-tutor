// routes/bookmarks.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Contest = require('../models/Contest');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/bookmarks
// @desc    Get all bookmarked contests
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('bookmarkedContests');
    res.json(user.bookmarkedContests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/bookmarks
// @desc    Add a bookmark
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const { contestId } = req.body;
    
    // Verify contest exists
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }
    
    // Add to bookmarks
    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { bookmarkedContests: contestId } }
    );
    
    res.json({ msg: 'Contest bookmarked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/bookmarks/:contestId
// @desc    Remove a bookmark
// @access  Private
router.delete('/:contestId', authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { bookmarkedContests: req.params.contestId } }
    );
    
    res.json({ msg: 'Contest unbookmarked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;