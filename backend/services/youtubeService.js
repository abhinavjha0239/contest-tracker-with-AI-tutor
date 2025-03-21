const axios = require('axios');
const { BASE_URL, YOUTUBE_API_KEY, PLATFORM_PLAYLISTS } = require('../config/youtube');
const Contest = require('../models/Contest');

// Function to search for videos within a specific playlist
async function searchPlaylistForContestVideos(playlistId, contestInfo, contestEndTime) {
  try {
    console.log(`Searching playlist ${playlistId} for contest videos...`);
    
    if (!YOUTUBE_API_KEY) {
      console.error('YouTube API key is not configured');
      return [];
    }

    // First get all playlist items (videos)
    const response = await axios.get(`${BASE_URL}/playlistItems`, {
      params: {
        part: 'snippet,contentDetails',
        maxResults: 50, // Maximum allowed by YouTube API
        playlistId: playlistId,
        key: YOUTUBE_API_KEY
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      console.log('No videos found in playlist');
      return [];
    }

    // Filter videos by contest name and publication date
    const contestEnd = new Date(contestEndTime);
    const matchingVideos = response.data.items
      .filter(item => {
        // Check if video published after contest end
        const publishDate = new Date(item.snippet.publishedAt);
        
        // Check if video title or description contains contest identifiers
        const title = item.snippet.title.toLowerCase();
        let matchesContest = false;
        
        // Check for contest number
        if (contestInfo.number && title.includes(contestInfo.number)) {
          matchesContest = true;
        }
        
        // Check for contest type (weekly, biweekly, etc.)
        if (contestInfo.contestType && title.includes(contestInfo.contestType.toLowerCase())) {
          matchesContest = true;
        }

        return publishDate > contestEnd && matchesContest;
      })
      .map(item => ({
        id: item.contentDetails.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : null,
        fromOfficialPlaylist: true,
        score: 1500  // Give very high score to official playlist videos
      }));

    console.log(`Found ${matchingVideos.length} matching videos in playlist`);
    return matchingVideos;
  } catch (error) {
    console.error('Error searching playlist:', error.message);
    return [];
  }
}

// Function to search for multiple contest videos on YouTube
async function searchContestVideos(contestName, platform, contestEndTime, maxResults = 25) {
  try {
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'your_youtube_api_key_here') {
      console.error('YouTube API key is not properly configured in .env file');
      return [];
    }

    // Try to find contest in database first
    let contest = null;
    try {
      contest = await Contest.findOne({
        name: contestName,
        platform: platform
      });
    } catch (dbErr) {
      console.error('Error querying database for contest:', dbErr.message);
      // Continue with API search if database lookup fails
    }

    // Check if we have cached videos that are recent enough
    const ONE_DAY = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    if (contest && 
        contest.videos && 
        contest.videos.length > 0 && 
        contest.videosLastChecked && 
        (new Date() - new Date(contest.videosLastChecked)) < ONE_DAY) {
      console.log(`Using ${contest.videos.length} cached videos for ${contestName} (${platform})`);
      return contest.videos;
    }

    // If we reach here, we need to search using the API
    console.log(`No recent cached videos found for ${contestName} (${platform}), searching YouTube API...`);

    // Extract important identifiers from contest name
    const contestInfo = extractContestInfo(contestName, platform);
    
    // Initialize videos array with potential matches from official playlists
    let allVideos = [];
    
    // Check if we have an official playlist for this platform
    const platformKey = platform.toLowerCase();
    if (PLATFORM_PLAYLISTS[platformKey]) {
      console.log(`Found official playlist for ${platform}`);  // Fixed syntax error
      const playlistVideos = await searchPlaylistForContestVideos(
        PLATFORM_PLAYLISTS[platformKey],
        contestInfo,
        contestEndTime
      );
      if (playlistVideos.length > 0) {
        allVideos = [...playlistVideos];
        console.log(`Adding ${playlistVideos.length} videos from official playlist`);
      }
    }
    
    // Create search queries for regular YouTube search
    const searchQueries = createSearchQueries(contestInfo, contestName, platform);
    
    console.log(`Searching for videos with queries for: "${contestName}" (${platform})`);
    
    // Convert contest end time to Date object for comparison
    const contestEnd = new Date(contestEndTime);
    
    // Preferred channel ID
    const PREFERRED_CHANNEL_ID = 'UCqL-fzHtN3NQPbYqGymMbTA';
    
    // Add error tracking for API quota issues
    let apiQuotaExceeded = false;
    let apiErrors = 0;
    const MAX_API_ERRORS = 3; // After this many errors, stop making requests
    
    // Try each search query if we need more videos and haven't hit quota limits
    if (allVideos.length < maxResults && !apiQuotaExceeded && apiErrors < MAX_API_ERRORS) {
      for (const searchQuery of searchQueries) {
        console.log(`Trying query: "${searchQuery}"`);
        
        // Stop making requests if we've seen too many errors
        if (apiErrors >= MAX_API_ERRORS || apiQuotaExceeded) {
          console.log('Stopping API requests due to excessive errors or quota limits');
          break;
        }
      
        try {
          const response = await axios.get(`${BASE_URL}/search`, {
            params: {
              part: 'snippet',
              maxResults: 50,
              q: searchQuery,
              type: 'video',
              key: YOUTUBE_API_KEY
            }
          });
          
          if (response.data.items && response.data.items.length > 0) {
            // Filter videos: only include those published after the contest end time
            const filteredItems = response.data.items.filter(item => {
              const publishDate = new Date(item.snippet.publishedAt);
              return publishDate > contestEnd;
            });
            
            if (filteredItems.length > 0) {
              // Score videos by relevance to contest
              const scoredVideos = await scoreVideos(filteredItems, contestInfo, platform, PREFERRED_CHANNEL_ID);
              allVideos = [...allVideos, ...scoredVideos];
            }
          }
        } catch (error) {
          console.error(`Error with search query "${searchQuery}":`, error.message);
          
          if (error.response) {
            // Check for quota exceeded or forbidden access
            if (error.response.status === 403 || error.response.status === 429) {
              apiQuotaExceeded = true;
              console.error('YouTube API quota exceeded or access forbidden. Stopping further requests.');
              break; // Stop trying more queries
            }
          }
          
          apiErrors++;
          continue;
        }
      }
    }
    
    // Even if we hit API errors, still process any videos we found
    if (apiQuotaExceeded || apiErrors >= MAX_API_ERRORS) {
      console.warn(`API limitations encountered after finding ${allVideos.length} videos. Using what we have.`);
    }
    
    // Remove duplicates, prioritizing videos from official playlists
    const uniqueVideos = removeDuplicateVideos(allVideos);
    
    // Sort videos by score (not by view count)
    uniqueVideos.sort((a, b) => b.score - a.score);
    
    // Only fetch additional details if we haven't exceeded API limits
    let topVideos = uniqueVideos.slice(0, maxResults);
    if (!apiQuotaExceeded && apiErrors < MAX_API_ERRORS) {
      await enrichVideosWithContentDetails(topVideos);
    }
    
    // Final filtering
    let verifiedVideos = topVideos;
    if (!apiQuotaExceeded && apiErrors < MAX_API_ERRORS) {
      verifiedVideos = topVideos.filter(video => {
        // Skip verification for official playlist videos
        if (video.fromOfficialPlaylist) return true;
        
        const descriptionMatches = checkDescriptionForContest(video.fullDescription, contestInfo, platform);
        return descriptionMatches;
      });
    }
    
    // Add a warning message for API quota issues
    if (apiQuotaExceeded) {
      const dummyMessage = {
        id: 'api-limit',
        title: 'YouTube API Quota Exceeded',
        description: 'We are currently experiencing YouTube API quota limits. Try again later or contact support.',
        channelTitle: 'System Message',
        publishedAt: new Date().toISOString(),
        thumbnail: 'https://via.placeholder.com/480x360?text=API+Limit+Reached',
        isSystemMessage: true
      };
      
      // Only add the message if we have no videos
      if (verifiedVideos.length === 0) {
        verifiedVideos = [dummyMessage];
      }
    }
    
    console.log(`Found ${uniqueVideos.length} videos, ${verifiedVideos.length} verified matches.`);
    
    // After getting verified videos, save them to database if the contest exists
    if (contest && verifiedVideos.length > 0) {
      try {
        contest.videos = verifiedVideos;
        contest.videosChecked = true;
        contest.videosLastChecked = new Date();
        await contest.save();
        console.log(`Saved ${verifiedVideos.length} videos to database for future reference`);
      } catch (saveErr) {
        console.error('Error saving videos to database:', saveErr.message);
        // Continue regardless of save error
      }
    }
    
    return verifiedVideos;
  } catch (error) {
    if (error.response) {
      console.error('YouTube API Error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else {
      console.error('Error searching YouTube videos:', error.message);
    }
    return [];
  }
}

// Extract important contest identifiers with platform-specific logic
function extractContestInfo(contestName, platform) {
  const info = {
    originalName: contestName,
    number: null,
    division: null,
    contestType: null
  };
  
  // LeetCode specific pattern
  if (platform.toLowerCase() === 'leetcode') {
    // Check for biweekly contests
    const biweeklyMatch = contestName.match(/(?:bi.?weekly|bi.?weekly\s+contest)\s+(\d+)/i);
    if (biweeklyMatch) {
      info.contestType = 'biweekly';
      info.number = biweeklyMatch[1];
    } else {
      // Check for weekly contests - improved pattern matching
      const weeklyMatch = contestName.match(/(?:weekly|weekly\s+contest)\s+(\d+)/i);
      if (weeklyMatch) {
        info.contestType = 'weekly';
        info.number = weeklyMatch[1];
      } else if (contestName.toLowerCase().includes('weekly')) {
        // Try to extract just the number for weekly contests with different formats
        const numberMatch = contestName.match(/\d+/);
        if (numberMatch) {
          info.contestType = 'weekly';
          info.number = numberMatch[0];
        }
      }
    }
  } 
  // Codeforces specific pattern - enhanced
  else if (platform.toLowerCase() === 'codeforces') {
    // Extract contest type (Educational, Global, Div, etc.)
    if (contestName.toLowerCase().includes('educational')) {
      info.contestType = 'educational';
    } else if (contestName.toLowerCase().includes('global')) {
      info.contestType = 'global';
    } else {
      info.contestType = 'regular';
    }

    // Extract round number - improved pattern matching
    const roundMatches = [
      // Match "Round 932" pattern
      contestName.match(/(?:round|contest)\s+#?(\d+)/i),
      // Match "#932" pattern
      contestName.match(/#(\d+)/i),
      // Match just the number if it's preceded by a space
      contestName.match(/\s+(\d{3,})\b/i)
    ];
    
    for (const match of roundMatches) {
      if (match) {
        info.number = match[1];
        break;
      }
    }
    
    // Extract division with more flexible pattern matching
    const divMatches = [
      contestName.match(/\b(?:div\.?|division)\s*(\d+)/i),
      contestName.match(/\bdiv\.?\s*(\d+)/i)
    ];
    
    for (const match of divMatches) {
      if (match) {
        info.division = match[1];
        break;
      }
    }
  } 
  // CodeChef specific pattern
  else if (platform.toLowerCase() === 'codechef') {
    // Detect contest type
    if (contestName.toLowerCase().includes('long') || 
        contestName.toLowerCase().includes('challenge')) {
      info.contestType = 'long';
    } else if (contestName.toLowerCase().includes('lunchtime')) {
      info.contestType = 'lunchtime';
    } else if (contestName.toLowerCase().includes('cook-off') || 
              contestName.toLowerCase().includes('cookoff')) {
      info.contestType = 'cookoff';
    } else if (contestName.toLowerCase().includes('starters')) {
      info.contestType = 'starters';
      // Extract starters number
      const startersMatch = contestName.match(/starters\s+(\d+)/i);
      if (startersMatch) {
        info.number = startersMatch[1];
      }
    }
    
    // Try to extract month/year information
    const monthYearMatch = contestName.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i);
    if (monthYearMatch) {
      info.month = monthYearMatch[1].toLowerCase();
      info.year = monthYearMatch[2];
    }
    
    // Extract any numeric identifier if not already found
    if (!info.number) {
      const numberMatch = contestName.match(/(\d+)/);
      if (numberMatch) {
        info.number = numberMatch[1];
      }
    }
  }
  // Generic extraction for other platforms
  else {
    const numberMatch = contestName.match(/\d+/);
    if (numberMatch) {
      info.number = numberMatch[0];
    }
  }
  
  return info;
}

// Create platform-specific search queries
function createSearchQueries(contestInfo, contestName, platform) {
  if (platform.toLowerCase() === 'leetcode') {
    return createLeetCodeSearchQueries(contestInfo, contestName);
  } 
  else if (platform.toLowerCase() === 'codeforces') {
    return createCodeforcesSearchQueries(contestInfo, contestName);
  }
  else if (platform.toLowerCase() === 'codechef') {
    return createCodeChefSearchQueries(contestInfo, contestName);
  }
  else {
    // Generic search queries
    return [
      `${platform} ${contestName} solution`,
      `${platform} ${contestName} editorial`,
      `${contestName} ${platform} problems explained`,
      `${platform} ${contestName} TLE eliminators` // Added TLE Eliminators query
    ];
  }
}

// Create more LeetCode-specific search queries
function createLeetCodeSearchQueries(contestInfo, contestName) {
  const queries = [];
  
  if (contestInfo.contestType === 'weekly' && contestInfo.number) {
    queries.push(
      `leetcode weekly contest ${contestInfo.number} solution`,
      `leetcode weekly contest ${contestInfo.number} explanation`,
      `leetcode weekly ${contestInfo.number} problems explained`,
      `leetcode contest ${contestInfo.number} solutions`,
      `leetcode weekly contest ${contestInfo.number} walkthrough`,
      `leetcode weekly contest ${contestInfo.number} TLE eliminators` // Added TLE Eliminators query
    );
  } 
  else if (contestInfo.contestType === 'biweekly' && contestInfo.number) {
    queries.push(
      `leetcode biweekly contest ${contestInfo.number} solution`,
      `leetcode biweekly contest ${contestInfo.number} explanation`,
      `leetcode biweekly ${contestInfo.number} problems explained`,
      `leetcode contest ${contestInfo.number} solutions`,
      `leetcode bi-weekly contest ${contestInfo.number} walkthrough`,
      `leetcode biweekly contest ${contestInfo.number} TLE eliminators` // Added TLE Eliminators query
    );
  }
  else {
    // Generic LeetCode contest queries
    queries.push(
      `leetcode ${contestName} solution`,
      `leetcode ${contestName} explanation`,
      `${contestName} leetcode problems explained`,
      `leetcode ${contestName} TLE eliminators` // Added TLE Eliminators query
    );
  }
  
  return queries;
}

// Create Codeforces-specific search queries
function createCodeforcesSearchQueries(contestInfo, contestName) {
  const queries = [];
  
  // Basic queries with contest name
  queries.push(
    `codeforces ${contestName} solution`,
    `codeforces ${contestName} editorial`,
    `codeforces ${contestName} TLE eliminators` // Added TLE Eliminators query
  );
  
  // If we have round number, create more specific queries
  if (contestInfo.number) {
    queries.push(
      `codeforces round ${contestInfo.number} solution`,
      `codeforces round ${contestInfo.number} editorial`,
      `cf round ${contestInfo.number} walkthrough`,
      `codeforces round ${contestInfo.number} TLE eliminators` // Added TLE Eliminators query
    );
    
    // Add division if available
    if (contestInfo.division) {
      queries.push(
        `codeforces round ${contestInfo.number} div ${contestInfo.division} solution`,
        `cf ${contestInfo.number} div ${contestInfo.division} editorial`,
        `codeforces round ${contestInfo.number} div ${contestInfo.division} TLE eliminators` // Added TLE Eliminators query
      );
    }
    
    // Add contest type if it's educational or global
    if (contestInfo.contestType === 'educational') {
      queries.push(
        `codeforces educational round ${contestInfo.number} solution`,
        `educational codeforces round ${contestInfo.number} editorial`
      );
    } else if (contestInfo.contestType === 'global') {
      queries.push(
        `codeforces global round ${contestInfo.number} solution`,
        `cf global ${contestInfo.number} editorial`
      );
    }
  }
  
  return queries;
}

// Create CodeChef-specific search queries
function createCodeChefSearchQueries(contestInfo, contestName) {
  const queries = [];
  
  // Basic queries with contest name
  queries.push(
    `codechef ${contestName} solution`,
    `codechef ${contestName} editorial`,
    `codechef ${contestName} TLE eliminators` // Added TLE Eliminators query
  );
  
  // Handle specific contest types
  if (contestInfo.contestType === 'long') {
    queries.push(
      `codechef long challenge ${contestInfo.month || ''} ${contestInfo.year || ''} solution`,
      `codechef long challenge ${contestInfo.month || ''} ${contestInfo.year || ''} editorial`,
      `codechef long challenge ${contestInfo.month || ''} ${contestInfo.year || ''} TLE eliminators` // Added TLE Eliminators query
    );
  } else if (contestInfo.contestType === 'cookoff') {
    queries.push(
      `codechef cookoff ${contestInfo.number} solution`,
      `codechef cook-off ${contestInfo.number} editorial`,
      `codechef cookoff ${contestInfo.number} TLE eliminators` // Added TLE Eliminators query
    );
  } else if (contestInfo.contestType === 'lunchtime') {
    queries.push(
      `codechef lunchtime ${contestInfo.number} solution`,
      `codechef lunchtime ${contestInfo.number} editorial`,
      `codechef lunchtime ${contestInfo.number} TLE eliminators` // Added TLE Eliminators query
    );
  } else if (contestInfo.contestType === 'starters') {
    queries.push(
      `codechef starters ${contestInfo.number} solution`,
      `codechef starters ${contestInfo.number} editorial`,
      `codechef starters ${contestInfo.number} TLE eliminators` // Added TLE Eliminators query
    );
  }
  
  return queries;
}

// Function to check video description for contest keywords - enhanced for all platforms
function checkDescriptionForContest(description, contestInfo, platform) {
  if (!description) return true; // No description available to check
  
  const descLower = description.toLowerCase();
  const platformLower = platform.toLowerCase();
  
  // Platform-specific abbreviations check
  const platformAbbreviations = {
    'leetcode': ['lc'],
    'codeforces': ['cf', 'codeforces'],
    'codechef': ['cc', 'codechef']
  };
  
  // Check if description contains the platform name or abbreviation
  const platformMatches = [platformLower, ...(platformAbbreviations[platformLower] || [])];
  if (!platformMatches.some(term => descLower.includes(term))) {
    return false;
  }
  
  // Platform-specific description checks
  if (platformLower === 'leetcode') {
    // Check if description contains contest type and number
    if (contestInfo.contestType === 'biweekly') {
      return (
        (descLower.includes('biweekly') || descLower.includes('bi-weekly') || descLower.includes('bi weekly') || 
         descLower.includes('biweekly contest') || descLower.includes('contest') || descLower.includes('lc')) && 
        descLower.includes(contestInfo.number)
      );
    } else if (contestInfo.contestType === 'weekly') {
      return (
        (descLower.includes('weekly') || descLower.includes('weekly contest') || 
         descLower.includes('contest') || descLower.includes('lc')) && 
        descLower.includes(contestInfo.number)
      );
    }
  }
  else if (platformLower === 'codeforces') {
    // Check for round number
    if (contestInfo.number) {
      const roundPatterns = [
        `round ${contestInfo.number}`,
        `round #${contestInfo.number}`,
        `#${contestInfo.number}`
      ];
      
      if (!roundPatterns.some(pattern => descLower.includes(pattern))) {
        return false;
      }
    }
    
    // Check for division if available
    if (contestInfo.division) {
      const divPatterns = [
        `div ${contestInfo.division}`, 
        `div. ${contestInfo.division}`,
        `division ${contestInfo.division}`
      ];
      
      // Division is important but not always mentioned
      const hasDivision = divPatterns.some(pattern => descLower.includes(pattern));
      if (contestInfo.division && !hasDivision) {
        // Less strict - don't reject just because division is missing
        // But give lower confidence score
      }
    }
  }
  else if (platformLower === 'codechef') {
    // For CodeChef, check contest type
    if (contestInfo.contestType) {
      const typePatterns = {
        'long': ['long challenge', 'long contest'],
        'cookoff': ['cook-off', 'cookoff', 'cook off'],
        'lunchtime': ['lunchtime', 'lunch time'],
        'starters': ['starters', 'starter']
      };
      
      const patterns = typePatterns[contestInfo.contestType] || [];
      if (!patterns.some(pattern => descLower.includes(pattern))) {
        // Less strict for CodeChef contest types
      }
    }
    
    // Check for contest number for starters
    if (contestInfo.contestType === 'starters' && contestInfo.number) {
      const hasStarterNumber = descLower.includes(`starters ${contestInfo.number}`) || 
                              descLower.includes(`starter ${contestInfo.number}`);
      if (!hasStarterNumber) {
        return false;
      }
    }
  }
  
  // Generic check
  if (contestInfo.number) {
    return descLower.includes(contestInfo.number);
  }
  
  return true;
}

// Score videos based on relevance to contest
async function scoreVideos(videos, contestInfo, platform, preferredChannelId) {
  // Map of popular channels for quick lookup
  const popularChannels = {
    // General CP channels
    'UCqL-fzHtN3NQPbYqGymMbTA': { name: 'NeetCode', score: 1000, platforms: ['leetcode'] },
    'UCBr_Fu6q9iHYQCh13jmpbrg': { name: 'Errichto', score: 800, platforms: ['codeforces'] },
    'UCKuDLsO0Wwef53qdHPjbU2Q': { name: 'William Lin', score: 700, platforms: ['codeforces'] },
    'UCYvQTh9aUgPZmVH0wNHFa1A': { name: 'Algorithms Live!', score: 600, platforms: ['codeforces'] },
    
    // LeetCode specialists
    'UC0SymiBozZBX0DuSBFwO_cw': { name: 'HappyCoding', score: 800, platforms: ['leetcode'] },
    'UCzNr-b1HzQxAIJWa1MaZ4fg': { name: 'Coding Decoded', score: 800, platforms: ['leetcode'] },
    'UC5xDNEcvb1vgw3lE2nz_IdQ': { name: 'KeeperOfLeetCode', score: 700, platforms: ['leetcode'] },
    'UCADm7lRlzvX4bw1lNFvzojA': { name: 'Kevin Naughton Jr.', score: 600, platforms: ['leetcode'] },
    
    // CodeForces specialists
    'UCdNNY8Y8meG-jM1t9TuNRRQ': { name: 'Colin Galen', score: 900, platforms: ['codeforces'] },
    'UCRGTIiPvDKILWiPWtFHIULw': { name: 'Second Thread', score: 800, platforms: ['codeforces'] },
    'UCS5Ja1ZlJu4UWaGgL9lUdWQ': { name: 'benq', score: 800, platforms: ['codeforces'] },
    'UC9cqYlXFG99QIfzjKdA-VVA': { name: 'TLE Eliminators', score: 700, platforms: ['codeforces'] },
    
    // CodeChef specialists
    'UCXgGY0wkgOzynnHvSEVmE3A': { name: 'CodeChef', score: 900, platforms: ['codechef'] },
    'UCcNEu-TU-Vc0qdgBm_20oLA': { name: 'LeadCoding by Abhishek', score: 800, platforms: ['codechef'] },
    'UCQHLEaYJeAIz-BrcCCtf6qQ': { name: 'CodeChef Discuss', score: 800, platforms: ['codechef'] },
    'UCLvSzpUEHsuf6LxeEtBL3aQ': { name: 'Striver', score: 700, platforms: ['codeforces', 'codechef'] }
  };
  
  return videos.map(video => {
    const title = video.snippet.title.toLowerCase();
    const channelId = video.snippet.channelId;
    let score = 0;
    
    // Scoring based on channel - with platform specificity
    const channelInfo = popularChannels[channelId];
    if (channelInfo) {
      // If the channel specializes in this platform, give even higher score
      if (channelInfo.platforms.includes(platform.toLowerCase())) {
        score += channelInfo.score;
      } else {
        score += Math.floor(channelInfo.score * 0.5); // Half score for non-specialized channels
      }
    }
    
    // Platform-specific scoring
    if (platform.toLowerCase() === 'leetcode') {
      // Enhanced scoring for LeetCode Weekly/Biweekly contests
      if (contestInfo.contestType === 'weekly' && title.includes('weekly') && title.includes(contestInfo.number)) {
        score += 150; // Highly relevant for weekly contests
      } else if (contestInfo.contestType === 'biweekly' && 
                (title.includes('biweekly') || title.includes('bi-weekly') || title.includes('bi weekly')) && 
                title.includes(contestInfo.number)) {
        score += 150; // Highly relevant for biweekly contests
      }
      
      // Keywords specific to LeetCode videos
      const leetcodeKeywords = ['all problems', 'all questions', 'problems explained', 'problem 1', 'q1', 'q2', 'q3', 'q4'];
      for (const keyword of leetcodeKeywords) {
        if (title.includes(keyword)) score += 20;
      }
    } 
    else if (platform.toLowerCase() === 'codeforces') {
      // For Codeforces, check round number and division
      if (contestInfo.number && title.includes(contestInfo.number)) {
        score += 100;
      }
      
      if (contestInfo.division && (
          title.includes(`div ${contestInfo.division}`) ||
          title.includes(`div. ${contestInfo.division}`) ||
          title.includes(`division ${contestInfo.division}`)
      )) {
        score += 80;
      }
      
      // Contest type specific scoring
      if (contestInfo.contestType === 'educational' && title.includes('educational')) {
        score += 80;
      }
      if (contestInfo.contestType === 'global' && title.includes('global')) {
        score += 80;
      }
      
      // Codeforces-specific keywords
      const cfKeywords = ['cf round', 'codeforces round', 'div', 'problem'];
      for (const keyword of cfKeywords) {
        if (title.includes(keyword)) score += 10;
      }
    }
    else if (platform.toLowerCase() === 'codechef') {
      // For CodeChef, check contest type and number
      if (contestInfo.contestType && title.includes(contestInfo.contestType)) {
        score += 80;
      }
      
      if (contestInfo.number && title.includes(contestInfo.number)) {
        score += 100;
      }
      
      if (contestInfo.month && title.includes(contestInfo.month)) {
        score += 40;
      }
      
      if (contestInfo.year && title.includes(contestInfo.year)) {
        score += 20;
      }
      
      // CodeChef-specific keywords
      const ccKeywords = ['codechef', 'starters', 'cookoff', 'long challenge', 'lunchtime'];
      for (const keyword of ccKeywords) {
        if (title.includes(keyword)) score += 15;
      }
    }
    
    // Platform name in title
    if (title.includes(platform.toLowerCase())) {
      score += 50;
    }
    
    // Check for contest specifics based on platform
    if (platform.toLowerCase() === 'leetcode') {
      // Match for biweekly/weekly contest number
      if (contestInfo.contestType && contestInfo.number) {
        if (
          title.includes(contestInfo.contestType) && 
          title.includes(contestInfo.number)
        ) {
          score += 100;
        }
      }
    } else if (platform.toLowerCase() === 'codeforces') {
      // Match for round number and division
      if (contestInfo.number && title.includes(contestInfo.number)) {
        score += 70;
      }
      if (contestInfo.division && title.includes(contestInfo.division)) {
        score += 50;
      }
    }
    
    // Check for exact contest name match
    if (title.includes(contestInfo.originalName.toLowerCase())) {
      score += 80;
    }
    
    // Keywords that indicate it's a solution video
    const solutionKeywords = ['solution', 'editorial', 'walkthrough', 'explanation', 'solve'];
    for (const keyword of solutionKeywords) {
      if (title.includes(keyword)) score += 30;
    }
    
    // Map the video with its score and essential info
    return {
      id: video.id.videoId,
      title: video.snippet.title,
      channelId: channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      thumbnail: video.snippet.thumbnails.medium.url,
      platformExpert: channelInfo?.platforms.includes(platform.toLowerCase()),
      score
    };
  });
}

// Helper function to fetch content details including full descriptions
async function enrichVideosWithContentDetails(videos) {
  if (!videos.length) return;
  
  try {
    const videoIds = videos.map(video => video.id).join(',');
    
    const response = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'snippet,contentDetails',
        id: videoIds,
        key: YOUTUBE_API_KEY
      }
    });
    
    if (response.data.items) {
      response.data.items.forEach(item => {
        const video = videos.find(v => v.id === item.id);
        if (video) {
          video.fullDescription = item.snippet.description;
          video.duration = item.contentDetails.duration;
        }
      });
    }
  } catch (error) {
    console.error('Error fetching video details:', error.message);
  }
}

// Remove duplicate videos
function removeDuplicateVideos(videos) {
  const seen = new Set();
  return videos.filter(video => {
    if (seen.has(video.id)) {
      return false;
    }
    seen.add(video.id);
    return true;
  });
}

// Function to update contest with video information
async function updateContestWithVideo(contestId) {
  try {
    const contest = await Contest.findById(contestId);
    if (!contest) {
      console.log(`Contest not found with ID: ${contestId}`);
      return null;
    }

    // Strict check that contest has ended
    const now = new Date();
    if (new Date(contest.endTime) > now) {
      console.log(`Contest ${contest.name} has not ended yet. No videos will be shown until it ends.`);
      return {
        ...contest.toObject(),
        videoChecked: true,
        contestActive: true
      };
    }

    console.log(`Searching videos for contest: ${contest.name} (${contest.platform})`);
    
    // Pass contest end time to ensure only videos published after contest are found
    const videos = await searchContestVideos(contest.name, contest.platform, contest.endTime, 1);
    
    if (videos.length > 0) {
      const videoInfo = videos[0];
      contest.videoId = videoInfo.id;
      contest.videoTitle = videoInfo.title;
      contest.videoThumbnail = videoInfo.thumbnail;
      contest.channelTitle = videoInfo.channelTitle;
      contest.videoChecked = true;
      await contest.save();
      console.log(`Updated contest ${contest._id} with video ID: ${videoInfo.id}`);
    } else {
      // Mark as checked even if no video found
      contest.videoChecked = true;
      await contest.save();
      console.log(`No video found for contest: ${contest.name}`);
    }
    
    return contest;
  } catch (error) {
    console.error('Error updating contest with video:', error.message);
    return null;
  }
}

// Original functions for backward compatibility
async function searchContestVideo(contestName, platform) {
  const videos = await searchContestVideos(contestName, platform, 1);
  return videos.length > 0 ? {
    videoId: videos[0].id,
    videoTitle: videos[0].title,
    videoThumbnail: videos[0].thumbnail,
    channelTitle: videos[0].channelTitle
  } : null;
}

// Helper function to extract contest number from name
function extractContestNumber(contestName) {
  // Extract numbers like "Round 932" or "Contest 123"
  const match = contestName.match(/(?:Round|Contest|Div\.?|#)\s*(\d+)/i);
  return match ? match[0] : null;
}

// Helper function to find the best matching video from results
function findBestVideoMatch(videos, contestName) {
  const keywords = ['solution', 'editorial', 'walkthrough', 'explanation', 'solve'];
  const contestWords = contestName.toLowerCase().split(/\s+/);
  
  // Score each video based on title relevance
  const scoredVideos = videos.map(video => {
    const title = video.snippet.title.toLowerCase();
    let score = 0;
    
    // Check for solution keywords
    keywords.forEach(keyword => {
      if (title.includes(keyword)) score += 5;
    });
    
    // Check for contest name words
    contestWords.forEach(word => {
      if (word.length > 2 && title.includes(word)) score += 3;
    });
    
    return { video, score };
  });
  
  // Sort by score (descending)
  scoredVideos.sort((a, b) => b.score - a.score);
  
  // Return the best match if it has a reasonable score (more than 5)
  return scoredVideos.length > 0 && scoredVideos[0].score > 5 ? scoredVideos[0].video : null;
}

// Function to batch update videos for all contests
async function batchUpdateContestVideos() {
  try {
    // Find contests without videos, prioritize recent ones
    const contests = await Contest.find({
      videoChecked: { $ne: true },
      videoId: { $exists: false }
    })
    .sort({ endTime: -1 })
    .limit(5);
    
    const results = [];
    for (const contest of contests) {
      const updated = await updateContestWithVideo(contest._id);
      if (updated) {
        results.push({
          contestId: updated._id,
          name: updated.name,
          videoId: updated.videoId
        });
      }
      // Add a small delay to avoid hitting YouTube API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  } catch (error) {
    console.error('Error in batch update:', error.message);
    return [];
  }
}

// Function to check if the YouTube API key is valid and has quota remaining
async function checkYouTubeAPIHealth() {
  try {
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'your_youtube_api_key_here') {
      console.error('YouTube API key is not properly configured in .env file');
      return false;
    }
    
    // Make a minimal API call to test the key
    const response = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'id',
        id: 'dQw4w9WgXcQ', // A known video ID
        key: YOUTUBE_API_KEY
      }
    });
    
    if (response.status === 200) {
      console.log('YouTube API key is valid and working.');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('YouTube API key check failed:', error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      
      // Provide more helpful messages for common errors
      if (error.response.status === 403) {
        console.error('The API key is invalid, revoked, or has reached its quota limit.');
      } else if (error.response.status === 400) {
        console.error('Bad request. The API key might be malformed.');
      }
    }
    
    return false;
  }
}

module.exports = {
  searchContestVideo,
  updateContestWithVideo,
  batchUpdateContestVideos,
  searchContestVideos,
  checkYouTubeAPIHealth  // Properly export the function
};
