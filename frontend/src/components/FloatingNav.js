import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCalendar, FaHistory, FaBookmark, FaMoon, FaSun } from 'react-icons/fa';
import './FloatingNav.css';

const NAV_ITEMS = [
  {
    name: "Upcoming",
    path: "/upcoming",
    icon: FaCalendar,
    requiresAuth: false
  },
  {
    name: "Past",
    path: "/past",
    icon: FaHistory,
    requiresAuth: false
  },
  {
    name: "Bookmarks",
    path: "/bookmarks",
    icon: FaBookmark,
    requiresAuth: true
  }
];

const FloatingNav = ({ isAuthenticated, handleLogout, darkMode, toggleTheme }) => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setVisible(currentScrollY < 60 || currentScrollY < lastScrollY);
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className={`floating-nav ${visible ? 'visible' : 'hidden'}`}>
      <div className="floating-nav-content">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          return (!item.requiresAuth || isAuthenticated) && (
            <Link
              key={`nav-${idx}`}
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              <span className="nav-icon"><Icon /></span>
              <span className="nav-text">{item.name}</span>
            </Link>
          );
        })}
        
        <button className="theme-toggle" onClick={toggleTheme}>
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
        
        {isAuthenticated ? (
          <button className="auth-button" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <Link to="/login" className="auth-button">
            <span>Login</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default FloatingNav;
