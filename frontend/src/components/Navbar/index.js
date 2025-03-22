import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCalendar } from 'react-icons/fa';
import PlatformSubscriptions from '../common/PlatformSubscriptions';

const Navbar = ({ isAuthenticated, handleLogout }) => {
  const [showSubscriptions, setShowSubscriptions] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">Contest Tracker</Link>
      </div>
      <div className="nav-links">
        {isAuthenticated ? (
          <>
            <div className="dropdown">
              <button 
                className="nav-link calendar-btn"
                onClick={() => setShowSubscriptions(!showSubscriptions)}
              >
                <FaCalendar /> Calendar
              </button>
              {showSubscriptions && (
                <div className="dropdown-content">
                  <PlatformSubscriptions onClose={() => setShowSubscriptions(false)} />
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="nav-link">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;