// routes/contests.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Contest = require('../models/Contest');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { updateContestWithVideo, batchUpdateContestVideos, searchContestVideos } = require('../services/youtubeService');

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

// Get video information for a specific contest
router.get('/:contestId/video', async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Check if contest has ended
    const now = new Date();
    if (new Date(contest.endTime) > now) {
      return res.json({
        videoAvailable: false,
        contestActive: true,
        message: 'Videos will be available after the contest ends'
      });
    }

    // If video info doesn't exist, try to fetch it
    if (!contest.videoId) {
      const updatedContest = await updateContestWithVideo(req.params.contestId);
      if (updatedContest) {
        return res.json({
          videoId: updatedContest.videoId,
          videoTitle: updatedContest.videoTitle,
          videoThumbnail: updatedContest.videoThumbnail,
          channelTitle: updatedContest.channelTitle
        });
      }
      return res.json({ videoAvailable: false });
    }

    return res.json({
      videoId: contest.videoId,
      videoTitle: contest.videoTitle,
      videoThumbnail: contest.videoThumbnail,
      channelTitle: contest.channelTitle,
      videoAvailable: !!contest.videoId
    });
  } catch (error) {
    console.error('Error fetching contest video:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get multiple video matches for a specific contest
router.get('/:contestId/videos', async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Strict check if contest has ended
    const now = new Date();
    if (new Date(contest.endTime) > now) {
      return res.json({
        contestName: contest.name,
        platform: contest.platform,
        contestActive: true,
        message: 'Solution videos will only be available after the contest ends',
        videos: []
      });
    }

    // Check if we have cached videos that are recent enough (within 24 hours)
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (contest.videos && 
        contest.videos.length > 0 && 
        contest.videosLastChecked && 
        (now - new Date(contest.videosLastChecked)) < ONE_DAY) {
      console.log(`Using ${contest.videos.length} cached videos for ${contest.name}`);
      
      return res.json({
        contestName: contest.name,
        platform: contest.platform,
        endTime: contest.endTime,
        videos: contest.videos,
        fromCache: true
      });
    }

    // If no recent cached videos, search for new ones
    console.log(`No recent cached videos found for ${contest.name}, searching YouTube...`);
    const videos = await searchContestVideos(contest.name, contest.platform, contest.endTime);
    
    // Save the videos to the database for future use
    if (videos.length > 0) {
      contest.videos = videos;
      contest.videosChecked = true;
      contest.videosLastChecked = now;
      await contest.save();
      console.log(`Saved ${videos.length} videos to database for future reference`);
    }
    
    res.json({
      contestName: contest.name,
      platform: contest.platform,
      endTime: contest.endTime,
      videos: videos,
      fromCache: false
    });
  } catch (error) {
    console.error('Error fetching contest videos:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to refresh cached videos if they're too old
router.post('/:contestId/refresh-videos', authenticate, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Force refresh videos from YouTube
    const videos = await searchContestVideos(contest.name, contest.platform, contest.endTime);
    
    // Save the refreshed videos
    contest.videos = videos;
    contest.videosChecked = true;
    contest.videosLastChecked = new Date();
    await contest.save();
    
    res.json({
      contestName: contest.name,
      platform: contest.platform,
      endTime: contest.endTime,
      videos: videos,
      refreshed: true
    });
  } catch (error) {
    console.error('Error refreshing contest videos:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin route to trigger batch update of contest videos
router.post('/update-videos', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const results = await batchUpdateContestVideos();
    res.json({ success: true, updatedContests: results });
  } catch (error) {
    console.error('Error updating contest videos:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/contests/:contestId
// @desc    Get a contest by ID
// @access  Public
router.get('/:contestId', async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    
    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }
    
    // Check for authentication to return bookmark status
    let isBookmarked = false;
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          isBookmarked = user.bookmarkedContests.some(id => id.toString() === contest._id.toString());
        }
      } catch (err) {
        // Token error, continue without bookmark info
      }
    }
    
    const contestWithBookmark = {
      ...contest.toObject(),
      bookmarked: isBookmarked
    };
    
    res.json(contestWithBookmark);
  } catch (err) {
    console.error(`Error fetching contest: ${err.message}`);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;