import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getEnabledPlatforms } from '../../utils/platforms';
import { FaCheck, FaSpinner } from 'react-icons/fa';
import './PlatformSubscriptions.css';

const PlatformSubscriptions = ({ onClose }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [message, setMessage] = useState('');
  const [calendarEnabled, setCalendarEnabled] = useState(false);

  useEffect(() => {
    checkCalendarStatus();
    fetchSubscriptions();
  }, []);

  const checkCalendarStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/calendar/auth/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCalendarEnabled(response.data.isEnabled);
    } catch (err) {
      console.error('Failed to check calendar status:', err);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/calendar/subscriptions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSubscriptions(response.data);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/calendar/auth/url', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      window.location.href = response.data.url;
    } catch (err) {
      setMessage('Failed to start Google authorization');
    }
  };

  const toggleSubscription = async (platform) => {
    try {
      if (!calendarEnabled) {
        setMessage('Google Calendar access required');
        return;
      }
      setActionLoading(prev => ({ ...prev, [platform]: true }));
      setMessage('Adding contests to calendar...');
      
      const isSubscribed = subscriptions.some(s => s.platform === platform);
      
      if (isSubscribed) {
        await axios.delete(`http://localhost:5000/api/calendar/unsubscribe/${platform}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage(`Unsubscribed from ${platform}`);
      } else {
        const response = await axios.post(`http://localhost:5000/api/calendar/subscribe/${platform}`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage(`Subscribed to ${platform}. Added ${response.data.addedEvents} contests to calendar!`);
      }
      
      await fetchSubscriptions();
      setTimeout(() => setMessage(''), 5000); // Increased timeout to show the count
    } catch (err) {
      if (err.response?.data?.needsAuth) {
        setMessage('Please authorize Google Calendar access');
      } else {
        setMessage('Failed to update subscription');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  if (loading) return (
    <div className="subscription-loading">
      <FaSpinner className="spin" /> Loading...
    </div>
  );

  return (
    <div className="platform-subscriptions-dropdown">
      <h3>Calendar Notifications</h3>
      {!calendarEnabled ? (
        <div className="calendar-auth">
          <p>Connect your Google Calendar to enable automatic reminders</p>
          <button onClick={handleGoogleAuth} className="google-auth-btn">
            Connect Google Calendar
          </button>
        </div>
      ) : (
        <>
          <p className="subscription-desc">Get calendar reminders for:</p>
          {message && <div className="subscription-message">{message}</div>}
          <div className="subscription-list">
            {getEnabledPlatforms().map(platform => (
              <div key={platform.name} className="subscription-item">
                <label className={subscriptions.some(s => s.platform === platform.name) ? 'active' : ''}>
                  <input
                    type="checkbox"
                    checked={subscriptions.some(s => s.platform === platform.name)}
                    onChange={() => toggleSubscription(platform.name)}
                    disabled={actionLoading[platform.name]}
                  />
                  <span className="platform-name">{platform.displayName}</span>
                  {actionLoading[platform.name] ? (
                    <FaSpinner className="spin" />
                  ) : subscriptions.some(s => s.platform === platform.name) && (
                    <FaCheck className="check" />
                  )}
                </label>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PlatformSubscriptions;
