// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
const connectDB = require('./config/db');
const Contest = require('./models/Contest');
const { platforms, getPlatformByResourceId } = require('./config/platforms');

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Drop existing contests collection on startup (temporary fix)
const resetCollection = async () => {
  try {
    await Contest.collection.drop();
    console.log('Contests collection dropped successfully');
  } catch (err) {
    // Collection might not exist yet, which is fine
    if (err.code !== 26) {
      console.error('Error dropping collection:', err);
    }
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Define routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contests', require('./routes/contests'));
app.use('/api/bookmarks', require('./routes/bookmarks'));
app.use('/api/admin', require('./routes/admin'));

// Function to fetch contests from clist.by API
const fetchContests = async () => {
  try {
    console.log('Fetching contests from clist.by API...');
    
    // Calculate dates for filtering
    const now = new Date();
    const pastDate = new Date(now);
    pastDate.setMonth(pastDate.getMonth() - 1); // Get contests from last month
    const futureDate = new Date(now);
    futureDate.setMonth(futureDate.getMonth() + 2); // Get contests for next 2 months

    // Get resource IDs from enabled platforms
    const resourceIds = Object.values(platforms)
      .filter(p => p.enabled)
      .map(p => p.resourceId)
      .join(',');

    const response = await axios.get('https://clist.by/api/v1/contest/', {
      params: {
        username: process.env.CLIST_USERNAME,
        api_key: process.env.CLIST_API_KEY,
        resource__id__in: resourceIds,
        start__gte: pastDate.toISOString(),
        end__lte: futureDate.toISOString(),
        order_by: 'start',
        limit: 200
      }
    });
    
    const contests = response.data.objects;
    let updatedCount = 0;
    
    for (const contest of contests) {
      const platform = getPlatformByResourceId(contest.resource.id);
      if (!platform) continue;
      
      // Check for existing contest
      const existing = await Contest.findOne({
        platformId: platform.id,
        contestId: contest.id.toString()
      });

      const contestData = {
        platformId: platform.id,
        platform: platform.name,
        contestId: contest.id.toString(),
        name: contest.event,
        startTime: new Date(contest.start),
        endTime: new Date(contest.end),
        duration: contest.duration,
        url: contest.href
      };

      if (existing) {
        await Contest.findByIdAndUpdate(existing._id, contestData);
      } else {
        await new Contest(contestData).save();
      }
      
      updatedCount++;
    }
    
    console.log(`Contests updated: ${updatedCount} contests processed`);
  } catch (err) {
    console.error('Error fetching contests:', err.message);
  }
};

// Schedule fetching every hour
cron.schedule('0 * * * *', fetchContests);

// Run reset and initial fetch
(async () => {
  await resetCollection();
  await fetchContests();
})();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));