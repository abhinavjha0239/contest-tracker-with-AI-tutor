import React, { useState } from 'react';
import { FaFilter, FaCheck, FaTimes, FaChevronDown } from 'react-icons/fa';
import './PlatformFilters.css';
import { getEnabledPlatforms } from '../../../utils/platforms';

const PlatformFilters = ({ platforms, setPlatforms, hideHeader = false }) => {
  // Change default state to true so it's open by default
  const [isOpen, setIsOpen] = useState(true);
  const enabledPlatforms = getEnabledPlatforms();

  const handleSelectAll = () => {
    setPlatforms(enabledPlatforms.map(p => p.name));
  };

  const handleClearAll = () => {
    setPlatforms([]);
  };

  const handleTogglePlatform = (platform) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  return (
    <div className={`platform-filters-container ${isOpen || hideHeader ? 'open' : ''}`}>
      <div className="platform-filters-toggle" onClick={() => setIsOpen(!isOpen)}>
        {!hideHeader && (
          <h3>
            <FaFilter /> Filter Platforms
          </h3>
        )}
        {!hideHeader && (
          <button className={`toggle-btn ${isOpen ? 'open' : ''}`}>
            <FaChevronDown />
          </button>
        )}
      </div>
      
      <div className="platform-filters-content">
        <div className="platform-filters-actions">
          <button onClick={handleSelectAll} className="filter-action-btn">
            <FaCheck /> Select All
          </button>
          <button onClick={handleClearAll} className="filter-action-btn">
            <FaTimes /> Clear
          </button>
        </div>
        <div className="platform-filters-list">
          {enabledPlatforms.map(platform => (
            <label 
              key={platform.name} 
              className="platform-checkbox"
              data-platform={platform.name}
              style={{
                '--platform-color': platform.color,
                '--primary-color-rgb': platform.name === 'Codeforces' ? '30, 136, 229' :
                                     platform.name === 'CodeChef' ? '92, 64, 51' :
                                     platform.name === 'LeetCode' ? '255, 161, 22' :
                                     '34, 34, 34'
              }}
            >
              <input
                type="checkbox"
                checked={platforms.includes(platform.name)}
                onChange={() => handleTogglePlatform(platform.name)}
              />
              <span className="platform-name">{platform.displayName}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlatformFilters;
