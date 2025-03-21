import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import axios from 'axios';
import './ContestVideos.css';

const ContestVideos = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contestData, setContestData] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const { contestId } = useParams();
  const history = useHistory();
  
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/contests/${contestId}/videos`);
        setContestData(response.data);
        setFromCache(response.data.fromCache || false);
        setError(null);
      } catch (err) {
        console.error('Error fetching contest videos:', err);
        setError('Failed to load videos for this contest');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [contestId]);

  const handleRefreshVideos = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`http://localhost:5000/api/contests/${contestId}/refresh-videos`);
      setContestData(response.data);
      setFromCache(false);
      setError(null);
    } catch (err) {
      console.error('Error refreshing videos:', err);
      setError('Failed to refresh videos for this contest');
    } finally {
      setLoading(false);
    }
  };
  
  const handleWatchVideo = (videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getVideoYear = (publishedAt) => {
    return new Date(publishedAt).getFullYear();
  };
  
  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  const isVideoPublishedAfterContestEnd = (videoPublishDate, contestEndDate) => {
    return new Date(videoPublishDate) > new Date(contestEndDate);
  };

  // Enhanced helper function to identify platform-specific content creators
  const getPlatformExpertInfo = (channelTitle, channelId, platform) => {
    // Platform-specific popular channels
    const platformExperts = {
      'leetcode': {
        channels: ['neetcode', 'happycoding', 'coding decoded', 'keeperofleetcode', 'kevin naughton', 'nick white'],
        label: "LC Specialist",
        className: "leetcode-specialist-badge platform-expert-badge"
      },
      'codeforces': {
        channels: ['errichto', 'colin galen', 'second thread', 'benq', 'tle eliminators', 'william lin'],
        label: "CF Specialist",
        className: "codeforces-expert-badge platform-expert-badge"
      },
      'codechef': {
        channels: ['codechef', 'leadcoding', 'striver', 'codechef discuss'],
        label: "CC Specialist",
        className: "codechef-expert-badge platform-expert-badge"
      }
    };

    // First check for NeetCode as the preferred channel
    if (channelTitle.includes("NeetCode") || channelId === 'UCqL-fzHtN3NQPbYqGymMbTA') {
      return {
        label: "Preferred",
        className: "preferred-channel-badge"
      };
    }
    
    // Then check if this channel is a platform expert
    const platformLower = platform.toLowerCase();
    const expertInfo = platformExperts[platformLower];
    
    if (expertInfo && expertInfo.channels.some(channel => 
        channelTitle.toLowerCase().includes(channel))) {
      return {
        label: expertInfo.label,
        className: expertInfo.className
      };
    }
    
    return null;
  };

  const getPlatformTagClass = (platform) => {
    const platformLower = platform.toLowerCase();
    return `${platformLower}-tag platform-tag`;
  };

  if (loading) {
    return (
      <div className="contest-videos-container">
        <button className="back-button" onClick={() => history.goBack()}>
          ← Back to contests
        </button>
        <div className="loading-videos">Loading videos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contest-videos-container">
        <button className="back-button" onClick={() => history.goBack()}>
          ← Back to contests
        </button>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="contest-videos-container">
      <button className="back-button" onClick={() => history.goBack()}>
        ← Back to contests
      </button>
      
      <div className="contest-videos-header">
        <h1>
          Solution Videos
          {contestData.platform && (
            <span className={getPlatformTagClass(contestData.platform)}>
              {contestData.platform}
            </span>
          )}
        </h1>
        <p>
          {contestData.contestName} • {contestData.platform}
          {contestData.endTime && (
            <span className="contest-end-time"> • Ended on {formatDate(contestData.endTime)}</span>
          )}
          {fromCache && (
            <span className="cached-results-badge"> • Using cached results</span>
          )}
        </p>
        
        {fromCache && (
          <button className="refresh-videos-button" onClick={handleRefreshVideos}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.65,2.35c-1.39-1.39-3.33-2.26-5.45-2.26c-4.25,0-7.7,3.45-7.7,7.7s3.45,7.7,7.7,7.7c3.32,0,6.14-2.12,7.2-5.07h-1.93c-0.97,1.91-2.94,3.22-5.27,3.22c-3.21,0-5.83-2.61-5.83-5.83s2.61-5.83,5.83-5.83c1.54,0,2.94,0.6,3.97,1.58l-3.03,3.03h6.5v-6.5L13.65,2.35z" fill="currentColor"/>
            </svg>
            Refresh Videos
          </button>
        )}
      </div>

      {contestData.contestActive ? (
        <div className="contest-active-message">
          <div className="no-videos">
            Contest is still active. Solution videos will be available after the contest ends.
          </div>
        </div>
      ) : contestData.videos.length === 0 ? (
        <div className="no-videos">
          No solution videos found for this contest.
        </div>
      ) : (
        <div className="videos-grid">
          {contestData.videos
            .filter(video => isVideoPublishedAfterContestEnd(video.publishedAt, contestData.endTime))
            .map((video) => {
              const expertInfo = getPlatformExpertInfo(
                video.channelTitle, 
                video.channelId, 
                contestData.platform
              );
              
              return (
                <div key={video.id} className="video-card">
                  <div 
                    className="video-thumbnail" 
                    onClick={() => handleWatchVideo(video.id)}
                  >
                    <img 
                      src={video.thumbnail} 
                      alt={video.title} 
                    />
                    <div className="play-button">
                      <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    
                    {/* Show official playlist badge if from an official playlist */}
                    {video.fromOfficialPlaylist && (
                      <div className="official-playlist-badge">
                        Official
                      </div>
                    )}
                    
                    {/* Show appropriate badge based on channel and platform */}
                    {expertInfo && !video.fromOfficialPlaylist && (
                      <div className={expertInfo.className}>
                        {expertInfo.label}
                      </div>
                    )}
                  </div>
                  <div className="video-info">
                    <div className="video-title">{video.title}</div>
                    <div className="video-channel">{video.channelTitle}</div>
                    <div className="video-date">
                      Published: {formatDate(video.publishedAt)}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default ContestVideos;
