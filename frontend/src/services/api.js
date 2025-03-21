import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

export const api = {
  auth: {
    login: (credentials) => axios.post(`${BASE_URL}/auth/login`, credentials),
    register: (userData) => axios.post(`${BASE_URL}/auth/register`, userData),
  },
  contests: {
    upcoming: (params) => axios.get(`${BASE_URL}/contests/upcoming`, { params }),
    past: (params) => axios.get(`${BASE_URL}/contests/past`, { params }),
    bookmarked: () => axios.get(`${BASE_URL}/bookmarks`),
  },
  bookmarks: {
    add: (contestId) => axios.post(`${BASE_URL}/bookmarks`, { contestId }),
    remove: (contestId) => axios.delete(`${BASE_URL}/bookmarks/${contestId}`),
  },
  // Get contest video information
  getContestVideo: async (contestId) => {
    try {
      const response = await axios.get(`${BASE_URL}/contests/${contestId}/video`);
      return response.data;
    } catch (error) {
      console.error('Error fetching contest video:', error);
      throw error;
    }
  },
  
  // Get multiple videos for a contest
  getContestVideos: async (contestId) => {
    try {
      const response = await axios.get(`${BASE_URL}/contests/${contestId}/videos`);
      return response.data;
    } catch (error) {
      console.error('Error fetching contest videos:', error);
      throw error;
    }
  },
  
  // Admin method to batch update videos
  updateContestVideos: async () => {
    try {
      const response = await axios.post(`${BASE_URL}/contests/update-videos`);
      return response.data;
    } catch (error) {
      console.error('Error updating contest videos:', error);
      throw error;
    }
  }
};
