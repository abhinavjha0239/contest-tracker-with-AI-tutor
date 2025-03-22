import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ContestList from '../../components/common/ContestList';
import PlatformFilters from '../../components/common/PlatformFilters';
import PlatformSubscriptions from '../../components/common/PlatformSubscriptions';
import { getEnabledPlatforms } from '../../utils/platforms';
import './styles.css'; // We'll create this

const UpcomingContests = ({ isAuthenticated }) => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platforms, setPlatforms] = useState(getEnabledPlatforms().map(p => p.name));

  const fetchContests = React.useCallback(async () => {
    try {
      setLoading(true);
      const headers = {};
      if (isAuthenticated) {
        headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
      }

      const response = await axios.get(`http://localhost:5000/api/contests/upcoming?platforms=${platforms.join(',')}`, { headers });
      setContests(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch contests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [platforms, isAuthenticated]);

  useEffect(() => {
    fetchContests();
  }, [platforms, fetchContests]);

  const toggleBookmark = async (contestId, isBookmarked) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (isBookmarked) {
        await axios.delete(`http://localhost:5000/api/bookmarks/${contestId}`, { headers });
      } else {
        await axios.post('http://localhost:5000/api/bookmarks', { contestId }, { headers });
      }
      fetchContests();
    } catch (err) {
      console.error('Failed to update bookmark:', err);
    }
  };

  return (
    <div className="contests-container">
      <div className="contests-header">
        <PlatformFilters platforms={platforms} setPlatforms={setPlatforms} />
        {isAuthenticated && <PlatformSubscriptions />}
      </div>
      {error && <div className="error-message">{error}</div>}
      <ContestList
        contests={contests}
        type="upcoming"
        isAuthenticated={isAuthenticated}
        toggleBookmark={toggleBookmark}
        loading={loading}
      />
    </div>
  );
};

export default UpcomingContests;
