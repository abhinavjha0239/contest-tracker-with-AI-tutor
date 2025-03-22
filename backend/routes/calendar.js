const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const Contest = require('../models/Contest');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const PlatformSubscription = require('../models/PlatformSubscription');

// Configure Google Calendar
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5000/api/calendar/auth/callback'  // Update this line
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Generate Google Calendar auth URL
router.get('/auth/url', authenticate, async (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events']
  });
  res.json({ url });
});

// Update the callback route
router.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Create unique state parameter to identify user
    const state = Math.random().toString(36).substring(7);
    
    // Store tokens temporarily (you might want to use Redis in production)
    global.tempTokens = global.tempTokens || {};
    global.tempTokens[state] = tokens;
    
    // Redirect to frontend with state parameter
    res.redirect(`http://localhost:3000/calendar/callback?state=${state}`);
  } catch (err) {
    console.error('Error in Google callback:', err);
    res.redirect('http://localhost:3000/calendar/callback?error=true');
  }
});

// Add new endpoint to exchange state for tokens
router.post('/auth/exchange', authenticate, async (req, res) => {
  const { state } = req.body;
  
  try {
    // Get tokens from temporary storage
    const tokens = global.tempTokens[state];
    if (!tokens) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    // Update user with Google Calendar tokens
    await User.findByIdAndUpdate(req.user.id, {
      'googleCalendar.accessToken': tokens.access_token,
      'googleCalendar.refreshToken': tokens.refresh_token,
      'googleCalendar.enabled': true
    });
    
    // Clean up
    delete global.tempTokens[state];
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error exchanging tokens:', err);
    res.status(500).json({ error: 'Failed to save calendar access' });
  }
});

// Add new endpoint to save Google tokens
router.post('/auth/save-tokens', authenticate, async (req, res) => {
  try {
    const { tempToken } = req.body;
    
    // Verify and decode the temporary token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    
    // Update user with Google Calendar tokens
    await User.findByIdAndUpdate(req.user.id, {
      'googleCalendar.accessToken': decoded.tokens.access_token,
      'googleCalendar.refreshToken': decoded.tokens.refresh_token,
      'googleCalendar.enabled': true
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving tokens:', err);
    res.status(500).json({ error: 'Failed to save calendar access' });
  }
});

// Check if user has calendar access
router.get('/auth/status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ 
      isEnabled: user.googleCalendar?.enabled || false 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check calendar status' });
  }
});

// @route   POST /api/calendar/add/:contestId
// @desc    Add contest to user's Google Calendar
// @access  Private
router.post('/add/:contestId', authenticate, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }

    // Create calendar event
    const event = {
      summary: `${contest.platform} - ${contest.name}`,
      description: `Contest Link: ${contest.url}\nPlatform: ${contest.platform}`,
      start: {
        dateTime: contest.startTime,
        timeZone: 'Asia/Kolkata'
      },
      end: {
        dateTime: contest.endTime,
        timeZone: 'Asia/Kolkata'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    // Add event to calendar
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    // Store calendar event ID
    contest.calendarEventId = response.data.id;
    await contest.save();

    res.json({ 
      msg: 'Contest added to calendar',
      eventId: response.data.id 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/calendar/remove/:contestId
// @desc    Remove contest from user's Google Calendar
// @access  Private
router.delete('/remove/:contestId', authenticate, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest || !contest.calendarEventId) {
      return res.status(404).json({ msg: 'Calendar event not found' });
    }

    // Remove from Google Calendar
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: contest.calendarEventId
    });

    // Remove calendar event ID from contest
    contest.calendarEventId = undefined;
    await contest.save();

    res.json({ msg: 'Contest removed from calendar' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/calendar/status/:contestId
// @desc    Check if contest is in user's calendar
// @access  Private
router.get('/status/:contestId', authenticate, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ msg: 'Contest not found' });
    }

    const isInCalendar = Boolean(contest.calendarEventId);
    res.json({ isInCalendar });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/calendar/subscribe/:platform
// @desc    Subscribe to platform for automatic calendar additions
// @access  Private
router.post('/subscribe/:platform', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.googleCalendar?.enabled) {
      return res.status(403).json({ 
        error: 'Calendar access required',
        needsAuth: true 
      });
    }

    const { platform } = req.params;
    
    let subscription = await PlatformSubscription.findOne({
      user: req.user.id,
      platform
    });

    if (subscription) {
      return res.status(400).json({ msg: 'Already subscribed to this platform' });
    }

    // Create new subscription
    subscription = new PlatformSubscription({
      user: req.user.id,
      platform
    });
    await subscription.save();

    // Set up oauth client for this user
    oauth2Client.setCredentials({
      access_token: user.googleCalendar.accessToken,
      refresh_token: user.googleCalendar.refreshToken
    });

    // Fetch all upcoming contests for this platform
    const now = new Date();
    const contests = await Contest.find({
      platform: platform,
      startTime: { $gt: now }
    });

    // Add each contest to user's calendar
    for (const contest of contests) {
      try {
        const event = {
          summary: `${contest.platform} - ${contest.name}`,
          description: `Contest Link: ${contest.url}\nPlatform: ${contest.platform}`,
          start: {
            dateTime: contest.startTime,
            timeZone: 'Asia/Kolkata'
          },
          end: {
            dateTime: contest.endTime,
            timeZone: 'Asia/Kolkata'
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 30 }
            ]
          }
        };

        const response = await calendar.events.insert({
          calendarId: 'primary',
          resource: event
        });

        contest.calendarEventId = response.data.id;
        await contest.save();
      } catch (err) {
        console.error(`Failed to add calendar event for contest ${contest._id}:`, err);
      }
    }

    res.json({ 
      msg: 'Successfully subscribed to platform',
      addedEvents: contests.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/calendar/unsubscribe/:platform
// @desc    Unsubscribe from platform automatic calendar additions
// @access  Private
router.delete('/unsubscribe/:platform', authenticate, async (req, res) => {
  try {
    await PlatformSubscription.findOneAndDelete({
      user: req.user.id,
      platform: req.params.platform
    });
    res.json({ msg: 'Subscription removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/calendar/subscriptions
// @desc    Get user's platform subscriptions
// @access  Private
router.get('/subscriptions', authenticate, async (req, res) => {
  try {
    const subscriptions = await PlatformSubscription.find({ user: req.user.id });
    res.json(subscriptions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
