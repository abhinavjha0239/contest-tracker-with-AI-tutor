// routes/admin.js
const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const { authenticate, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/s3Upload');

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

// @route   POST /api/admin/contest/:contestId/question
// @desc    Add a new question with file upload
// @access  Private (Admin only)
router.post('/contest/:contestId/question', authenticate, isAdmin, upload.single('file'), async (req, res) => {
  try {
    const { contestId } = req.params;
    const { questionId, title } = req.body;
    
    // Validate inputs
    if (!questionId || !title) {
      return res.status(400).json({ msg: 'Question ID and title are required' });
    }

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }

    // Get S3 file info if a file was uploaded
    let s3Key = null;
    let filePath = null;
    if (req.file) {
      s3Key = req.file.key;
      filePath = req.file.location; // S3 URL
    }

    // Check if question already exists
    const existingQuestionIndex = contest.questions.findIndex(q => q.questionId === questionId);
    if (existingQuestionIndex !== -1) {
      // Update existing question
      const existingQuestion = contest.questions[existingQuestionIndex];
      contest.questions[existingQuestionIndex].title = title;
      
      // Only update file paths if a new file was uploaded
      if (s3Key) {
        contest.questions[existingQuestionIndex].filePath = filePath;
        contest.questions[existingQuestionIndex].s3Key = s3Key;
      }
    } else {
      // Add new question
      contest.questions.push({ 
        questionId, 
        title, 
        filePath, 
        s3Key 
      });
    }

    await contest.save();
    res.json({ msg: 'Question added successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/admin/contest/:contestId/questions
// @desc    Get questions for a contest
// @access  Private (Admin only)
router.get('/contest/:contestId/questions', authenticate, isAdmin, async (req, res) => {
  try {
    const { contestId } = req.params;
    const contest = await Contest.findById(contestId).select('questions');
    
    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }
    
    res.json(contest.questions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/admin/contest/:contestId/question/:questionId
// @desc    Delete a question
// @access  Private (Admin only)
router.delete('/contest/:contestId/question/:questionId', authenticate, isAdmin, async (req, res) => {
  try {
    const { contestId, questionId } = req.params;
    
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }
    
    // Remove question
    contest.questions = contest.questions.filter(q => q.questionId !== questionId);
    await contest.save();
    
    res.json({ msg: 'Question deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;