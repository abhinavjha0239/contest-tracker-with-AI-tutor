import { useState, useCallback } from 'react';
import axios from 'axios';

export const useContests = (type = 'upcoming') => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchContests = useCallback(async (options = {}) => {
    const { platforms = [], page = 1, isAuthenticated = false } = options;
    
    try {
      setLoading(true);
      const headers = {};
      if (isAuthenticated) {
        headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
      }

      const response = await axios.get(
        `http://localhost:5000/api/contests/${type}?platforms=${platforms.join(',')}&page=${page}`,
        { headers }
      );
      
      if (type === 'past') {
        setContests(response.data.contests);
        setPagination(response.data.pagination);
      } else {
        setContests(response.data);
      }
      setError('');
    } catch (err) {
      setError('Failed to fetch contests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const toggleBookmark = async (contestId, isBookmarked) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isBookmarked) {
        await axios.delete(`http://localhost:5000/api/bookmarks/${contestId}`, { headers });
      } else {
        await axios.post('http://localhost:5000/api/bookmarks', { contestId }, { headers });
      }
      return true;
    } catch (err) {
      console.error('Failed to update bookmark:', err);
      return false;
    }
  };

  return {
    contests,
    loading,
    error,
    pagination,
    fetchContests,
    toggleBookmark
  };
};
