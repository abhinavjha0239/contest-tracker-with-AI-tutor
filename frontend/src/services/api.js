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
  }
};
