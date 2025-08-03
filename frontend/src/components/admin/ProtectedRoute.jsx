import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

// This component protects routes that require authentication.
// It can optionally check for specific roles.
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // User not logged in, redirect them to the login page
    // Pass the current location so we can redirect back after login
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check if the route requires specific roles and if the user has one of them
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      // User does not have the required role, redirect to an unauthorized page or dashboard
      // For simplicity, redirecting to a generic admin root for now.
      // A dedicated "Unauthorized" page would be better.
      console.warn(`User role '${userRole}' not authorized for this route. Required: ${allowedRoles.join(', ')}`);
      return <Navigate to="/admin" replace />; // Or to an "/unauthorized" page
    }
  }

  // User is authenticated and has the required role (if applicable)
  return children;
};

export default ProtectedRoute;

