import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ContestList from '../../components/common/ContestList';

const BookmarkedContests = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const response = await axios.get('http://localhost:5000/api/bookmarks', { headers });
      
      // Sort contests by start time
      const sortedContests = response.data.sort((a, b) => {
        return new Date(a.startTime) - new Date(b.startTime);
      });
      
      setContests(sortedContests.map(contest => ({ ...contest, bookmarked: true })));
      setError('');
    } catch (err) {
      setError('Failed to fetch bookmarks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (contestId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      await axios.delete(`http://localhost:5000/api/bookmarks/${contestId}`, { headers });
      fetchBookmarks();
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    }
  };

  return (
    <div className="contests-container">
      <ContestList
        contests={contests}
        type="bookmarked"
        isAuthenticated={true}
        toggleBookmark={toggleBookmark}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default BookmarkedContests;
