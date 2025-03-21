// src/components/ContestCard.js
import React from 'react';
import moment from 'moment';
import { FaBookmark, FaRegBookmark, FaYoutube, FaCalendar } from 'react-icons/fa';
import { createGoogleCalendarUrl } from '../../../utils/calendarUtils';
import './ContestCard.css';

const ContestCard = ({ 
  contest, 
  type, 
  isAuthenticated, 
  toggleBookmark,
  onViewVideos,
  hasContestEnded 
}) => {
  const { _id, name, platform, startTime, endTime, duration, url, youtubeLink, bookmarked } = contest;
  
  // Convert UTC to IST and format
  const formatToIST = (utcTime) => {
    return moment(utcTime)
      .add(5, 'hours')     // Add 5 hours
      .add(30, 'minutes')  // Add 30 minutes
      .format('MMM D, YYYY h:mm A [IST]');
  };
  
  // Calculate time remaining with IST conversion
  const getTimeRemaining = () => {
    const now = moment().utcOffset('+05:30');  // Current time in IST
    const start = moment(startTime).add(5, 'hours').add(30, 'minutes');  // Convert contest time to IST
    const diff = start.diff(now);
    
    if (diff <= 0) return 'Started';
    
    const duration = moment.duration(diff);
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    
    return `${days}d ${hours}h ${minutes}m`;
  };
  
  // Get platform-specific class for styling
  const getPlatformClass = () => {
    switch(platform) {
      case 'Codeforces': return 'codeforces';
      case 'CodeChef': return 'codechef';
      case 'LeetCode': return 'leetcode';
      default: return '';
    }
  };
  
  return (
    <div className={`contest-card ${getPlatformClass()}`}>
      <div className="contest-header">
        <div className="platform-badge">{platform}</div>
        {isAuthenticated && (
          <button 
            className={`bookmark-button ${bookmarked ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleBookmark(_id, bookmarked);
            }}
            aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            {bookmarked ? <FaBookmark /> : <FaRegBookmark />}
          </button>
        )}
      </div>
      
      <h3 className="contest-name">{name}</h3>
      
      <div className="contest-details">
        {type === 'upcoming' ? (
          <>
            <div className="detail-item">
              <span className="label">Starts:</span>
              <span className="value">{formatToIST(startTime)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Time Remaining:</span>
              <span className="value">{getTimeRemaining()}</span>
            </div>
          </>
        ) : (
          <>
            <div className="detail-item">
              <span className="label">Ended:</span>
              <span className="value">{formatToIST(endTime)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Duration:</span>
              <span className="value">{moment.duration(duration, 'seconds').humanize()}</span>
            </div>
          </>
        )}
      </div>
      
      <div className="contest-links">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="contest-link"
        >
          View Contest
        </a>
        
        {/* Add Videos button for past contests if contest has ended */}
        {type === 'past' && hasContestEnded && hasContestEnded(contest) && (
          <button 
            className="contest-link videos-link" 
            onClick={() => onViewVideos(_id, contest)}
          >
            Videos
          </button>
        )}
        
        {type === 'upcoming' && (
          <a
            href={createGoogleCalendarUrl(contest)}
            target="_blank"
            rel="noopener noreferrer"
            className="calendar-link"
            title="Add to Google Calendar"
          >
            <FaCalendar /> Add Reminder
          </a>
        )}
        
        {youtubeLink && (
          <a 
            href={youtubeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="youtube-link"
          >
            <FaYoutube /> Watch Editorial
          </a>
        )}
      </div>
    </div>
  );
};

export default ContestCard;