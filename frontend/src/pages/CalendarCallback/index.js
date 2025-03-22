import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import axios from 'axios';
import './styles.css';

const CalendarCallback = () => {
  const history = useHistory();
  const location = useLocation();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const error = params.get('error');
    const state = params.get('state');

    if (error) {
      setStatus('Failed to connect Google Calendar');
      setTimeout(() => history.push('/upcoming'), 3000);
      return;
    }

    if (token) {
      saveTokens(token);
    }

    if (state) {
      exchangeStateForTokens(state);
    }
  }, [location, history]);

  const saveTokens = async (token) => {
    try {
      await axios.post(
        'http://localhost:5000/api/calendar/auth/save-tokens',
        { tempToken: token },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setStatus('Successfully connected Google Calendar!');
      setTimeout(() => history.push('/upcoming'), 2000);
    } catch (err) {
      setStatus('Failed to save calendar access');
      setTimeout(() => history.push('/upcoming'), 3000);
    }
  };

  const exchangeStateForTokens = async (state) => {
    try {
      await axios.post(
        'http://localhost:5000/api/calendar/auth/exchange',
        { state },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setStatus('Successfully connected Google Calendar!');
      setTimeout(() => history.push('/upcoming'), 2000);
    } catch (err) {
      setStatus('Failed to save calendar access');
      setTimeout(() => history.push('/upcoming'), 3000);
    }
  };

  return (
    <div className="calendar-callback">
      <div className="callback-card">
        <div className="spinner"></div>
        <p>{status}</p>
      </div>
    </div>
  );
};

export default CalendarCallback;
