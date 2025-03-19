import React, { useState } from 'react';
import ContestCard from '../ContestCard';
import { FaList, FaThLarge, FaColumns } from 'react-icons/fa';
import './ContestList.css';

const ContestList = ({ contests, type, isAuthenticated, toggleBookmark, loading, error }) => {
  const [viewMode, setViewMode] = useState('grid'); // 'list', 'grid', 'platform'

  if (loading) {
    return <div className="contest-list-message">Loading contests...</div>;
  }

  if (error) {
    return <div className="contest-list-message error">{error}</div>;
  }

  if (!contests || contests.length === 0) {
    return <div className="contest-list-message">No contests found</div>;
  }

  const renderPlatformView = () => {
    const platformGroups = {
      Codeforces: contests.filter(c => c.platform === 'Codeforces'),
      CodeChef: contests.filter(c => c.platform === 'CodeChef'),
      LeetCode: contests.filter(c => c.platform === 'LeetCode'),
      AtCoder: contests.filter(c => c.platform === 'AtCoder')
    };

    return (
      <div className="platform-sections">
        {Object.entries(platformGroups).map(([platform, platformContests]) => (
          <div key={platform} className={`platform-section ${platform.toLowerCase()}`}>
            <div className="platform-header">
              <h2 className="platform-title">
                {platform}
                <span className="contest-count">{platformContests.length} Contests</span>
              </h2>
            </div>
            <div className="platform-contests">
              {platformContests.length > 0 ? (
                platformContests.map(contest => (
                  <ContestCard
                    key={contest._id}
                    contest={contest}
                    type={type}
                    isAuthenticated={isAuthenticated}
                    toggleBookmark={toggleBookmark}
                  />
                ))
              ) : (
                <div className="no-contests">No upcoming contests</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="contest-list-container">
      <div className="view-toggle">
        <button 
          className={viewMode === 'list' ? 'active' : ''} 
          onClick={() => setViewMode('list')}
          title="List View"
        >
          <FaList />
        </button>
        <button 
          className={viewMode === 'grid' ? 'active' : ''} 
          onClick={() => setViewMode('grid')}
          title="Grid View"
        >
          <FaThLarge />
        </button>
        <button 
          className={viewMode === 'platform' ? 'active' : ''} 
          onClick={() => setViewMode('platform')}
          title="Platform View"
        >
          <FaColumns />
        </button>
      </div>

      {viewMode === 'platform' ? (
        renderPlatformView()
      ) : (
        <div className={`contest-${viewMode}`}>
          {contests.map(contest => (
            <ContestCard
              key={contest._id}
              contest={contest}
              type={type}
              isAuthenticated={isAuthenticated}
              toggleBookmark={toggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContestList;
