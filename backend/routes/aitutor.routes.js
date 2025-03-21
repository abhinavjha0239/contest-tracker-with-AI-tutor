const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const { authenticate } = require('../middleware/auth');
const { getAIResponse, getS3FileContent } = require('../services/geminiService');
// Add upload middleware
const upload = require('../middleware/s3Upload');

// Add a basic test route at the top level - no auth required
router.get('/test-no-auth', (req, res) => {
  res.json({ msg: 'AI Tutor basic route works (no auth)' });
});

router.post('/test-post', (req, res) => {
  console.log('Test POST route accessed with data:', req.body);
  res.json({ msg: 'Test POST successful', data: req.body });
});

// @route   GET /api/aitutor/past-contests
// @desc    Get list of past contests
// @access  Private
router.get('/past-contests', authenticate, async (req, res) => {
  try {
    const contests = await Contest.find({ 
      endTime: { $lt: new Date() },
      'questions.0': { $exists: true } // Only contests with questions
    })
    .sort({ endTime: -1 })
    .select('name platform endTime');
    
    res.json(contests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/aitutor/contest/:contestId/questions
// @desc    Get questions for a past contest
// @access  Private
router.get('/contest/:contestId/questions', authenticate, async (req, res) => {
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

// Add these test routes to verify functionality
router.get('/test', (req, res) => {
  res.json({ msg: 'AI Tutor route is working!' });
});

router.get('/test-chat-file', (req, res) => {
  res.json({ msg: 'Chat file route is accessible' });
});

// @route   POST /api/aitutor/chat
// @desc    Chat with AI Tutor about a specific question
// @access  Private
router.post('/chat', authenticate, async (req, res) => {
  const { contestId, questionId, message, sessionId: clientSessionId } = req.body;

  try {
    // Validate required fields
    if (!contestId || !questionId || !message) {
      return res.status(400).json({ 
        msg: 'Missing required fields', 
        details: 'contestId, questionId, and message are required' 
      });
    }

    if (!message.trim()) {
      return res.status(400).json({ msg: 'Message cannot be empty' });
    }

    // Find the contest and question
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }

    const question = contest.questions.find(q => q.questionId === questionId);
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }

    try {
      // Get question content from S3 if available
      let questionContent = '';
      if (question.s3Key) {
        questionContent = await getS3FileContent(question.s3Key);
      }

      // Generate a consistent sessionId for this question
      const sessionId = clientSessionId || `question_${contestId}_${questionId}`;
      
      // Get AI response
      const aiResponse = await getAIResponse(
        question.title,
        questionContent,
        message,
        [],              // Empty history since we're using sessionId
        sessionId        // Session ID to maintain context
      );

      // Extract the text from the response object
      res.json({ 
        response: aiResponse.text,
        sessionId: aiResponse.sessionId
      });
    } catch (aiError) {
      console.error('AI Service Error:', aiError);
      res.status(503).json({ 
        msg: 'AI service temporarily unavailable',
        error: aiError.message
      });
    }
  } catch (err) {
    console.error('Error in AI tutor chat:', err);
    res.status(500).json({ 
      msg: 'Server error', 
      error: err.message 
    });
  }
});

// @route   POST /api/aitutor/chat-file
// @desc    Chat with AI about a file's content
// @access  Private
router.post('/chat-file', authenticate, async (req, res) => {
  try {
    const { s3Key, message, sessionId: clientSessionId } = req.body;
    
    // Validate required fields
    if (!s3Key || !message) {
      return res.status(400).json({ 
        msg: 'Missing required fields',
        details: 'Both s3Key and message are required'
      });
    }

    console.log('Chat-file POST endpoint hit with data:', { s3Key, message });

    // Get file content from S3
    console.log(`Attempting to retrieve file with key: ${s3Key}`);
    const fileContent = await getS3FileContent(s3Key);
    
    if (!fileContent) {
      return res.status(404).json({ msg: 'File content could not be retrieved' });
    }
    
    console.log(`File content retrieved, length: ${fileContent.length}`);
    
    if (fileContent.length === 0) {
      return res.status(400).json({ 
        msg: 'The uploaded file is empty. Please upload a file with content.'
      });
    }

    // Generate session ID if not provided
    const sessionId = clientSessionId || `file_${s3Key}`;

    // Get AI response
    const aiResponse = await getAIResponse(
      'File Analysis',
      fileContent,
      message,
      [],                // Empty history since we're using sessionId
      sessionId          // Session ID to maintain context
    );

    res.json({
      response: aiResponse.text,
      sessionId: aiResponse.sessionId
    });

  } catch (err) {
    console.error('Error in file chat:', err);
    res.status(500).json({ 
      msg: 'Server error',
      error: err.message 
    });
  }
});

// @route   POST /api/aitutor/upload
// @desc    Upload a file for AI processing
// @access  Private
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }
    
    // Return file information after successful upload
    res.json({ 
      filePath: req.file.location, 
      s3Key: req.file.key,
      fileName: req.file.originalname,
      msg: 'File uploaded successfully'
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ 
      msg: 'Server error during file upload', 
      error: err.message 
    });
  }
});

module.exports = router;
