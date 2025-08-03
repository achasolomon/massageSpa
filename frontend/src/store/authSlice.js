import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  user: null, // Store user info { id, email, firstName, lastName, role }
  token: localStorage.getItem('authToken') || null, // Initialize token from local storage
};

// Check if token exists on initial load to set isAuthenticated
if (initialState.token) {
  // TODO: Add token validation logic here (e.g., decode JWT, check expiry)
  // For now, assume token presence means authenticated, but this is insecure.
  // A better approach is to have an initial API call to verify the token and get user data.
  initialState.isAuthenticated = true;
  // User data should ideally be fetched based on the token, not stored directly long-term
  // Placeholder: try to parse user from local storage if stored previously
  try {
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      initialState.user = JSON.parse(storedUser);
    }
  } catch (e) {
    console.error("Failed to parse stored user data:", e);
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
    initialState.isAuthenticated = false;
    initialState.token = null;
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      // Persist token and user info to local storage
      localStorage.setItem('authToken', action.payload.token);
      localStorage.setItem('authUser', JSON.stringify(action.payload.user));
    },
    logoutSuccess: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    },
    logoutSuccess: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      // Clear token and user info from local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    },
    // Optional: Add reducer for token validation failure
    tokenValidationFailure: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
  },
});

export const { loginSuccess, logoutSuccess, tokenValidationFailure } = authSlice.actions;

export default authSlice.reducer;

