import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import ContestList from '../../components/common/ContestList';
import PlatformFilters from '../../components/common/PlatformFilters';
import PlatformSubscriptions from '../../components/common/PlatformSubscriptions';
import { getEnabledPlatforms } from '../../utils/platforms';
import './styles.css';

const UpcomingContests = ({ isAuthenticated }) => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platforms, setPlatforms] = useState(getEnabledPlatforms().map(p => p.name));
  const [showFilters, setShowFilters] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);

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
      <div className="collapsible-section">
        <div 
          className="section-header" 
          onClick={() => setShowFilters(!showFilters)}
        >
          <h3>Platform Filters</h3>
          {showFilters ? <FaChevronUp /> : <FaChevronDown />}
        </div>
        {showFilters && (
          <div className="section-content filters-content">
            <PlatformFilters 
              platforms={platforms} 
              setPlatforms={setPlatforms} 
              hideHeader={true}
            />
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div className="collapsible-section">
          <div 
            className="section-header" 
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <h3>Calendar Subscriptions</h3>
            {showCalendar ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {showCalendar && (
            <div className="section-content">
              <PlatformSubscriptions />
            </div>
          )}
        </div>
      )}

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
