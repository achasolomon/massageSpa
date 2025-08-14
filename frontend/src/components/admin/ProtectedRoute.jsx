import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  DialogContentText 
} from '@mui/material';
import useAuth from '../../hooks/useAuth';
import { clearDashboardRedirect } from '../../store/authSlice';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { 
    isAuthenticated, 
    user, 
    isSessionExpired, 
    clearSessionExpiredFlag,
    updateActivity,
    checkInactivity
  } = useAuth();
  
  const shouldRedirectToDashboard = useSelector((state) => state.auth.shouldRedirectToDashboard);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // Handle dashboard redirect for new logins - ONLY ONCE
  useEffect(() => {
    if (isAuthenticated && shouldRedirectToDashboard && !hasRedirected.current) {
      const currentPath = location.pathname;
      
      // Only redirect if not already on dashboard
      if (currentPath !== '/admin/dashboard' && currentPath !== '/admin') {
        console.log('New login detected, redirecting to dashboard from:', currentPath);
        hasRedirected.current = true;
        dispatch(clearDashboardRedirect());
        navigate('/admin/dashboard', { replace: true });
      } else {
        // Already on dashboard, just clear the flag
        dispatch(clearDashboardRedirect());
      }
    }
  }, [isAuthenticated, shouldRedirectToDashboard, location.pathname, navigate, dispatch]);

  // Reset redirect flag when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated]);

  // Update activity on route access - throttled
  useEffect(() => {
    if (isAuthenticated) {
      const lastUpdate = localStorage.getItem('lastActivityUpdate');
      const now = Date.now();
      
      // Only update activity every 30 seconds to avoid excessive calls
      if (!lastUpdate || (now - parseInt(lastUpdate)) > 30000) {
        updateActivity();
        localStorage.setItem('lastActivityUpdate', now.toString());
      }
    }
  }, [isAuthenticated, updateActivity, location.pathname]);

  // Check for inactivity on route changes - less frequent
  useEffect(() => {
    if (isAuthenticated) {
      const checkInactivityTimer = setTimeout(() => {
        checkInactivity();
      }, 1000); // Delay to avoid conflicts

      return () => clearTimeout(checkInactivityTimer);
    }
  }, [isAuthenticated, checkInactivity, location.pathname]);

  // Handle session expiration dialog
  const handleSessionExpired = () => {
    clearSessionExpiredFlag();
    hasRedirected.current = false;
    // Navigation will be handled by the auth state change
  };

  // Show session expired dialog
  if (isSessionExpired) {
    return (
      <Dialog 
        open={true} 
        disableEscapeKeyDown
        disableBackdropClick
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 400,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>
          Session Expired
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your session has expired for security reasons. Please log in again to continue.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={handleSessionExpired}
            color="primary" 
            variant="contained"
            fullWidth
            sx={{ borderRadius: 2 }}
          >
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!isAuthenticated) {
    // User not logged in, redirect to login page
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check if the route requires specific roles
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.warn(`User role '${userRole}' not authorized for this route. Required: ${allowedRoles.join(', ')}`);
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;