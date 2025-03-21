import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import './AiTutor.css';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AiTutor = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const history = useHistory();

  useEffect(() => {
    fetchPastContests();
  }, []);

  const fetchPastContests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/ai-tutor/past-contests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContests(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch contests. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContestClick = (contestId) => {
    history.push(`/ai-tutor/contest/${contestId}`);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="ai-tutor-container">
      <h1>AI Tutor</h1>
      <p className="description">
        Select a past contest to get help with problem solutions and explanations.
      </p>

      <div className="contests-grid">
        {contests.map(contest => (
          <div 
            key={contest._id} 
            className="contest-item"
            onClick={() => handleContestClick(contest._id)}
          >
            <h3>{contest.name}</h3>
            <div className="contest-meta">
              <span className="platform">{contest.platform}</span>
              <span className="date">{new Date(contest.endTime).toLocaleDateString()}</span>
            </div>
          </div>
        ))}

        {contests.length === 0 && (
          <div className="no-contests">
            No past contests with questions available yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default AiTutor;
