import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import FloatingNav from './components/FloatingNav';
import BubbleNav from './components/BubbleNav';
import Login from './pages/Login';
import Register from './pages/Register';
import UpcomingContests from './pages/UpcomingContests';
import PastContests from './pages/PastContests';
import BookmarkedContests from './pages/BookmarkedContests';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [navStyle, setNavStyle] = useState('bubble'); // 'floating' or 'bubble'

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Theme toggling
  useEffect(() => {
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const toggleNavStyle = () => {
    setNavStyle(prev => prev === 'floating' ? 'bubble' : 'floating');
  };

  return (
    <Router>
      <div className="App">
        {/* Choose which floating navigation to show */}
        {navStyle === 'floating' ? (
          <FloatingNav 
            isAuthenticated={isAuthenticated}
            handleLogout={handleLogout}
            darkMode={darkMode}
            toggleTheme={() => setDarkMode(!darkMode)}
          />
        ) : (
          <BubbleNav 
            isAuthenticated={isAuthenticated}
            handleLogout={handleLogout}
            darkMode={darkMode}
            toggleTheme={() => setDarkMode(!darkMode)}
          />
        )}
        
        {/* Nav style toggle button */}
        <button 
          className="nav-style-toggle" 
          onClick={toggleNavStyle}
          title={`Switch to ${navStyle === 'floating' ? 'bubble' : 'floating'} navigation`}
        >
          Switch Nav Style
        </button>
        
        <main className="main-content">
          <Switch>
            <Route exact path="/">
              <Redirect to="/upcoming" />
            </Route>
            
            <Route path="/upcoming">
              <UpcomingContests isAuthenticated={isAuthenticated} />
            </Route>
            
            <Route path="/past">
              <PastContests isAuthenticated={isAuthenticated} />
            </Route>
            
            <Route path="/bookmarks">
              {isAuthenticated ? (
                <BookmarkedContests />
              ) : (
                <Redirect to="/login" />
              )}
            </Route>
            
            <Route path="/login">
              <Login setIsAuthenticated={setIsAuthenticated} />
            </Route>
            
            <Route path="/register">
              <Register setIsAuthenticated={setIsAuthenticated} />
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;
