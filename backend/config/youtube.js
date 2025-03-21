const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const PREFERRED_CHANNEL_ID = 'UCqL-fzHtN3NQPbYqGymMbTA';

// Platform-specific official playlists
const PLATFORM_PLAYLISTS = {
  leetcode: 'PLcXpkI9A-RZI6FhydNz3JBt_-p_i25Cbr',
  codeforces: 'PLcXpkI9A-RZLUfBSNp-YQBCOezZKbDSgB',
  codechef: 'PLcXpkI9A-RZIZ6lsE0KCcLWeKNoG45fYr'
};

// Constants for API error handling
const API_ERRORS = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_KEY: 'INVALID_KEY',
  OTHER_ERROR: 'OTHER_ERROR'
};

module.exports = {
  YOUTUBE_API_KEY,
  PREFERRED_CHANNEL_ID,
  PLATFORM_PLAYLISTS,
  API_ERRORS,
  BASE_URL: 'https://www.googleapis.com/youtube/v3',
};
