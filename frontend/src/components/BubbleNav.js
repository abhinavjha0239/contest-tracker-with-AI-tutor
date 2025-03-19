import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCalendar, FaHistory, FaBookmark, FaMoon, FaSun, FaBars, FaTimes, FaUser } from 'react-icons/fa';
import './BubbleNav.css';

const NAV_ITEMS = [
  {
    name: "Upcoming",
    path: "/upcoming",
    icon: FaCalendar,
    color: "var(--primary-color)",
    requiresAuth: false
  },
  {
    name: "Past",
    path: "/past",
    icon: FaHistory,
    color: "var(--secondary-color)",
    requiresAuth: false
  },
  {
    name: "Bookmarks",
    path: "/bookmarks",
    icon: FaBookmark,
    color: "var(--accent-color)",
    requiresAuth: true
  }
];

const BubbleNav = ({ isAuthenticated, handleLogout, darkMode, toggleTheme }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeBubble, setActiveBubble] = useState(null);
  const bubbleRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const currentPath = location.pathname;
    const activeIndex = NAV_ITEMS.findIndex(item => item.path === currentPath);
    if (activeIndex >= 0) {
      setActiveBubble(activeIndex);
    }
    setupWaterAnimation();
  }, [location.pathname]);

  const setupWaterAnimation = () => {
    const container = containerRef.current;
    if (!container) return;

    const createBubble = () => {
      const bubble = document.createElement('div');
      bubble.className = 'water-bubble';
      const size = Math.random() * 40 + 10;
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${Math.random() * 100}%`;
      bubble.style.animationDuration = `${Math.random() * 4 + 4}s`;
      bubble.style.animationDelay = `${Math.random() * 2}s`;
      container.appendChild(bubble);
      setTimeout(() => bubble.remove(), 8000);
    };

    const interval = setInterval(createBubble, 1000);
    return () => clearInterval(interval);
  };

  const handleBubbleClick = (index) => {
    setActiveBubble(index);
    setIsOpen(false);
  };

  return (
    <div className={`bubble-nav-container ${isOpen ? 'open' : ''}`} ref={containerRef}>
      <button className="bubble-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      <div className="bubble-menu">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          return (!item.requiresAuth || isAuthenticated) && (
            <Link
              key={`bubble-${idx}`}
              to={item.path}
              ref={el => bubbleRefs.current[idx] = el}
              className={`bubble-item ${activeBubble === idx ? 'active' : ''}`}
              onClick={() => handleBubbleClick(idx)}
              style={{ '--bubble-color': item.color }}
            >
              <div className="bubble-icon"><Icon /></div>
              <span className="bubble-label">{item.name}</span>
            </Link>
          );
        })}

        <button 
          className="bubble-item theme-bubble" 
          onClick={toggleTheme}
          style={{ '--bubble-color': '#805ad5' }}
        >
          <div className="bubble-icon">
            {darkMode ? <FaSun /> : <FaMoon />}
          </div>
          <span className="bubble-label">Theme</span>
        </button>

        {isAuthenticated ? (
          <button 
            className="bubble-item auth-bubble" 
            onClick={handleLogout}
            style={{ '--bubble-color': '#e53e3e' }}
          >
            <div className="bubble-icon"><FaUser /></div>
            <span className="bubble-label">Logout</span>
          </button>
        ) : (
          <Link 
            to="/login" 
            className="bubble-item auth-bubble"
            style={{ '--bubble-color': '#38a169' }}
          >
            <div className="bubble-icon"><FaUser /></div>
            <span className="bubble-label">Login</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default BubbleNav;
