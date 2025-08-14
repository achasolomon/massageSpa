// src/components/ActivityTracker.js
import { useEffect } from 'react';
import useAuth from '../hooks/useAuth';

const ActivityTracker = ({ children }) => {
  const { isAuthenticated, updateActivity, checkInactivity } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for inactivity every 5 minutes
    const inactivityCheck = setInterval(() => {
      checkInactivity();
    }, 5 * 60 * 1000);

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityCheck);
    };
  }, [isAuthenticated, updateActivity, checkInactivity]);

  // Handle page visibility change (tab switching)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, check if session is still valid
        checkInactivity();
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, updateActivity, checkInactivity]);

  // Handle beforeunload (when user closes tab/window)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBeforeUnload = () => {
      // Update last activity timestamp
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated]);

  return children;
};

export default ActivityTracker;