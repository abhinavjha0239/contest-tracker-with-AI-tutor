import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import ContestList from '../../components/common/ContestList';
import PlatformFilters from '../../components/common/PlatformFilters';
import { getEnabledPlatforms } from '../../utils/platforms';
import './PastContests.css';

const PastContests = ({ isAuthenticated }) => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platforms, setPlatforms] = useState(getEnabledPlatforms().map(p => p.name));
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const history = useHistory();

  const fetchContests = React.useCallback(async () => {
    try {
      setLoading(true);
      const headers = {};
      if (isAuthenticated) {
        headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
      }

      const response = await axios.get(
        `http://localhost:5000/api/contests/past?platforms=${platforms.join(',')}&page=${page}`,
        { headers }
      );
      
      setContests(response.data.contests);
      setPagination(response.data.pagination);
      setError('');
    } catch (err) {
      setError('Failed to fetch contests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [platforms, page, isAuthenticated]);

  useEffect(() => {
    fetchContests();
  }, [platforms, page, fetchContests]);

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

  // Function to check if contest has ended
  const hasContestEnded = (contest) => {
    const now = new Date();
    return new Date(contest.endTime) < now;
  };

  const handleViewVideos = (contestId, contest) => {
    // Only navigate to videos page if contest has ended
    if (hasContestEnded(contest)) {
      history.push(`/contest/${contestId}/videos`);
    } else {
      // Optionally show a message that videos aren't available yet
      alert('Solution videos will be available after the contest ends.');
    }
  };

  return (
    <div className="contests-container">
      <PlatformFilters platforms={platforms} setPlatforms={setPlatforms} />
      <ContestList
        contests={contests}
        type="past"
        isAuthenticated={isAuthenticated}
        toggleBookmark={toggleBookmark}
        loading={loading}
        error={error}
        onViewVideos={handleViewVideos}
        hasContestEnded={hasContestEnded}
      />

      {!loading && !error && contests.length > 0 && (
        <div className="pagination">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span>Page {page} of {pagination.pages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page === pagination.pages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PastContests;
