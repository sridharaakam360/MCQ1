import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const AdminRoute = () => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('AdminRoute Mount:', {
      isAuthenticated,
      isAdmin,
      loading,
      user,
      location: location.pathname
    });
  }, [isAuthenticated, isAdmin, loading, user, location]);

  // Show loading state while checking authentication
  if (loading) {
    console.log('AdminRoute: Loading state');
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('AdminRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If not admin, redirect to dashboard
  if (!isAdmin) {
    console.log('AdminRoute: Not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and admin, render the child routes
  console.log('AdminRoute: Rendering admin routes');
  return <Outlet />;
};

export default AdminRoute; 