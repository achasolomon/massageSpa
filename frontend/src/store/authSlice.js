import { createSlice } from '@reduxjs/toolkit';

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Decode JWT token (assumes JWT format)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired (with 5 minute buffer)
    return payload.exp < (currentTime + 300);
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

// Helper function to clear all auth data and navigation state
const clearAllData = () => {
  // Clear auth data
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  localStorage.removeItem('tokenExpiry');
  localStorage.removeItem('loginTimestamp');
  localStorage.removeItem('lastActivity');
  localStorage.removeItem('currentUserId');
  
  // Clear any navigation/routing related data
  localStorage.removeItem('lastVisitedPage');
  localStorage.removeItem('currentRoute');
  localStorage.removeItem('previousRoute');
  
  // Clear any user-specific cached data
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('user_') ||
      key.startsWith('cache_') ||
      key.startsWith('preferences_') ||
      key.startsWith('settings_') ||
      key.includes('schedule') ||
      key.includes('booking')
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Also clear session storage
  sessionStorage.clear();
};

// Session timeout - 8 hours
const SESSION_DURATION = 8 * 60 * 60 * 1000;

const getInitialState = () => {
  // Only check for explicit logout flags
  const isLoggingOut = localStorage.getItem('isLoggingOut') === 'true';
  const userSwitching = localStorage.getItem('userSwitching') === 'true';
  
  // Clear logout flags and return logged out state if flagged
  if (isLoggingOut || userSwitching) {
    console.log('Logout flags detected, clearing all data');
    clearAllData();
    localStorage.removeItem('isLoggingOut');
    localStorage.removeItem('userSwitching');
    
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      sessionExpired: false,
      shouldRedirectToDashboard: false,
    };
  }

  const token = localStorage.getItem('authToken');
  const loginTimestamp = localStorage.getItem('loginTimestamp');
  const storedUser = localStorage.getItem('authUser');

  // If no auth data, return logged out state
  if (!token || !storedUser || !loginTimestamp) {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      sessionExpired: false,
      shouldRedirectToDashboard: false,
    };
  }

  // Check if session has expired
  const sessionAge = Date.now() - parseInt(loginTimestamp);
  if (sessionAge > SESSION_DURATION) {
    console.log('Session expired due to age');
    clearAllData();
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      sessionExpired: true,
      shouldRedirectToDashboard: false,
    };
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    console.log('Token expired');
    clearAllData();
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      sessionExpired: true,
      shouldRedirectToDashboard: false,
    };
  }

  // Valid session - restore state
  try {
    const user = JSON.parse(storedUser);
    console.log('Restoring valid session for user:', user.email);
    
    return {
      isAuthenticated: true,
      user: user,
      token: token,
      sessionExpired: false,
      shouldRedirectToDashboard: false, // Don't auto-redirect on restore
    };
  } catch (error) {
    console.error('Failed to parse stored user data:', error);
    clearAllData();
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      sessionExpired: false,
      shouldRedirectToDashboard: false,
    };
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    loginSuccess: (state, action) => {
      console.log('Login success - setting new session');
      
      const { user, token } = action.payload;
      
      // Check if this is a different user
      const currentUserId = localStorage.getItem('currentUserId');
      const isDifferentUser = currentUserId && currentUserId !== user.id;
      
      if (isDifferentUser) {
        console.log('Different user detected, clearing previous session');
        clearAllData();
      }
      
      state.isAuthenticated = true;
      state.user = user;
      state.token = token;
      state.sessionExpired = false;
      state.shouldRedirectToDashboard = true; // Only set true for fresh logins
      
      // Store new session data
      const loginTimestamp = Date.now().toString();
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(user));
      localStorage.setItem('loginTimestamp', loginTimestamp);
      localStorage.setItem('lastActivity', loginTimestamp);
      localStorage.setItem('currentUserId', user.id);
      
      console.log('New session established for user:', user.email);
    },
    
    logoutSuccess: (state) => {
      console.log('Logout initiated');
      
      // Set logout flag to prevent session restoration
      localStorage.setItem('isLoggingOut', 'true');
      
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.sessionExpired = false;
      state.shouldRedirectToDashboard = false;
      
      // Clear all data
      clearAllData();
      localStorage.removeItem('isLoggingOut');
      
      console.log('Logout completed');
    },
    
    sessionExpired: (state) => {
      console.log('Session expired');
      
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.sessionExpired = true;
      state.shouldRedirectToDashboard = false;
      
      clearAllData();
    },
    
    clearSessionExpired: (state) => {
      state.sessionExpired = false;
    },
    
    forceLogout: (state) => {
      console.log('Force logout initiated');
      
      localStorage.setItem('userSwitching', 'true');
      
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.sessionExpired = false;
      state.shouldRedirectToDashboard = false;
      
      clearAllData();
      localStorage.removeItem('userSwitching');
      
      console.log('Force logout completed');
      
      // Force navigation without reload
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 100);
    },
    
    clearDashboardRedirect: (state) => {
      state.shouldRedirectToDashboard = false;
    },
    
    // Update user activity without affecting auth state
    updateActivity: (state) => {
      if (state.isAuthenticated) {
        localStorage.setItem('lastActivity', Date.now().toString());
      }
    }
  },
});

export const { 
  loginSuccess, 
  logoutSuccess, 
  sessionExpired, 
  clearSessionExpired,
  forceLogout,
  clearDashboardRedirect,
  updateActivity
} = authSlice.actions;

export default authSlice.reducer;