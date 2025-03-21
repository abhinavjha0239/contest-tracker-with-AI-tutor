const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const Contest = require('../models/Contest');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

// Configure Google Calendar
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

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

module.exports = router;
