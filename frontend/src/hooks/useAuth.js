// src/hooks/useAuth.js
import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { logoutSuccess, sessionExpired, clearSessionExpired, forceLogout, updateActivity } from '../store/authSlice';

export const useAuth = () => {
  const { isAuthenticated, user, token, sessionExpired: isSessionExpired } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Check session validity periodically
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const checkSession = () => {
      const loginTimestamp = localStorage.getItem('loginTimestamp');
      const currentUserId = localStorage.getItem('currentUserId');
      
      if (!loginTimestamp || !currentUserId) {
        console.log('Missing session data, expiring session');
        dispatch(sessionExpired());
        return;
      }

      // Check if this is a different user
      if (user && currentUserId !== user.id) {
        console.log('User mismatch detected, expiring session');
        dispatch(sessionExpired());
        return;
      }

      // Check if session has been active for more than 8 hours (match auth slice)
      const sessionAge = Date.now() - parseInt(loginTimestamp);
      const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours to match auth slice

      if (sessionAge > SESSION_DURATION) {
        console.log('Session expired due to age');
        dispatch(sessionExpired());
        return;
      }

      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp < currentTime) {
          console.log('Token expired');
          dispatch(sessionExpired());
          return;
        }
      } catch (error) {
        console.error('Error checking token:', error);
        dispatch(sessionExpired());
      }
    };

    // Check immediately
    checkSession();

    // Then check every 2 minutes (more frequent but less aggressive)
    const intervalId = setInterval(checkSession, 2 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, token, user, dispatch]);

  // Regular logout
  const logout = useCallback(() => {
    console.log('Performing logout');
    dispatch(logoutSuccess());
  }, [dispatch]);

  // Force logout (for user switching)
  const forceLogoutUser = useCallback(() => {
    console.log('Performing force logout');
    dispatch(forceLogout());
  }, [dispatch]);

  // Clear session expired flag
  const clearSessionExpiredFlag = useCallback(() => {
    dispatch(clearSessionExpired());
  }, [dispatch]);

  // Update last activity timestamp
  const updateUserActivity = useCallback(() => {
    if (isAuthenticated) {
      dispatch(updateActivity());
    }
  }, [isAuthenticated, dispatch]);

  // Check if user has been inactive for too long
  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (!lastActivity || !isAuthenticated) return false;

    const inactiveTime = Date.now() - parseInt(lastActivity);
    const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000; // 2 hours

    if (inactiveTime > INACTIVITY_LIMIT) {
      console.log('Session expired due to inactivity');
      dispatch(sessionExpired());
      return true;
    }
    return false;
  }, [isAuthenticated, dispatch]);

  return {
    isAuthenticated,
    user,
    token,
    isSessionExpired,
    logout,
    forceLogoutUser,
    clearSessionExpiredFlag,
    updateActivity: updateUserActivity,
    checkInactivity,
  };
};

export default useAuth;