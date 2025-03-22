import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import axios from 'axios';
import FloatingNav from './components/FloatingNav';
import BubbleNav from './components/BubbleNav';
import Login from './pages/Login';
import Register from './pages/Register';
import UpcomingContests from './pages/UpcomingContests';
import PastContests from './pages/PastContests';
import BookmarkedContests from './pages/BookmarkedContests';
import ContestQuestions from './pages/ContestQuestions';
import AITutor from './pages/AITutor';
import ContestVideos from './pages/ContestVideos';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  // Get initial theme from localStorage or default to dark
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });
  const [navStyle, setNavStyle] = useState('bubble'); // 'floating' or 'bubble'

  // Check authentication status on mount and verify token
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      try {
        // Verify token with backend
        const res = await axios.get('http://localhost:5000/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.isValid) {
          setIsAuthenticated(true);
        } else {
          // Token invalid
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } catch (err) {
        // Token verification failed
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Theme toggling with localStorage persistence
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogout = async () => {
    try {
      // Call logout endpoint
      await axios.post('http://localhost:5000/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear token regardless of API response
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };

  const toggleNavStyle = () => {
    setNavStyle(prev => prev === 'floating' ? 'bubble' : 'floating');
  };

  const toggleTheme = () => {
    setDarkMode(prevMode => !prevMode);
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="loading-auth">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App" data-theme={darkMode ? 'dark' : 'light'}>
        {/* Choose which floating navigation to show */}
        {navStyle === 'floating' ? (
          <FloatingNav 
            isAuthenticated={isAuthenticated}
            handleLogout={handleLogout}
            darkMode={darkMode}
            toggleTheme={toggleTheme}
          />
        ) : (
          <BubbleNav 
            isAuthenticated={isAuthenticated}
            handleLogout={handleLogout}
            darkMode={darkMode}
            toggleTheme={toggleTheme}
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
              {isAuthenticated ? (
                <Redirect to="/upcoming" />
              ) : (
                <Login setIsAuthenticated={setIsAuthenticated} />
              )}
            </Route>
            
            <Route path="/register">
              {isAuthenticated ? (
                <Redirect to="/upcoming" />
              ) : (
                <Register setIsAuthenticated={setIsAuthenticated} />
              )}
            </Route>
            
            {/* Support both URL patterns for contest questions */}
            <Route path="/ai-tutor/contest/:contestId">
              {isAuthenticated ? (
                <ContestQuestions />
              ) : (
                <Redirect to="/login" />
              )}
            </Route>
            
            <Route path="/contest/:contestId/questions">
              {isAuthenticated ? (
                <ContestQuestions />
              ) : (
                <Redirect to="/login" />
              )}
            </Route>
            
            <Route path="/ai-tutor">
              {isAuthenticated ? (
                <AITutor />
              ) : (
                <Redirect to="/login" />
              )}
            </Route>
            
            <Route path="/contest/:contestId/videos">
              <ContestVideos />
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;
