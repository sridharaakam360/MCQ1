import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

const AdminRoute = () => {
  const { isAuthenticated, isAdmin, loading, user, checkAuth } = useAuth();
  const location = useLocation();
  const [verifyingAdmin, setVerifyingAdmin] = useState(true);
  const [adminError, setAdminError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        setVerifyingAdmin(true);
        setAdminError(null);

        // Check authentication state
        if (!isAuthenticated || !user?.id) {
          console.log('AdminRoute: Not authenticated or no user data');
          throw new Error('Authentication required');
        }

        // First check local admin status
        if (!isAdmin) {
          console.log('AdminRoute: Not admin');
          throw new Error('Admin access required');
        }

        // Only verify with backend if we haven't already
        const adminVerified = sessionStorage.getItem('adminVerified');
        if (!adminVerified) {
          try {
            // Simple admin verification request
            await apiService.admin.getUsers({ page: 1, limit: 1 });
            console.log('AdminRoute: Admin access verified');
            sessionStorage.setItem('adminVerified', 'true');
          } catch (error) {
            console.error('Admin verification failed:', error);
            sessionStorage.removeItem('adminVerified');
            
            if (error.response?.status === 403) {
              throw new Error('You do not have admin privileges');
            } else if (error.response?.status === 401) {
              localStorage.removeItem('token');
              throw new Error('Please log in again');
            } else {
              throw new Error('Failed to verify admin access');
            }
          }
        }
      } catch (error) {
        console.error('Admin verification failed:', error);
        setAdminError(error.message || 'Failed to verify admin access');
      } finally {
        setVerifyingAdmin(false);
      }
    };

    verifyAdminAccess();
  }, [isAuthenticated, isAdmin, user?.id, location.pathname]);

  // Show loading state while checking authentication
  if (loading || verifyingAdmin) {
    console.log('AdminRoute: Loading state');
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh" 
        gap={2}
        sx={{ p: 2 }}
      >
        <CircularProgress size={32} />
        <Box sx={{ 
          mt: 1, 
          textAlign: 'center',
          typography: 'body2',
          color: 'text.secondary'
        }}>
          {verifyingAdmin ? 'Verifying admin access...' : 'Loading...'}
        </Box>
        {adminError && (
          <Alert 
            severity="error" 
            variant="outlined"
            sx={{ 
              mt: 2,
              maxWidth: '100%',
              width: '400px',
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            {adminError === 'Failed to fetch' 
              ? 'Unable to connect to server. Please check your internet connection.' 
              : adminError === 'Authentication required' || adminError === 'Please log in again'
              ? 'Your session has expired. Please log in again.'
              : adminError}
          </Alert>
        )}
      </Box>
    );
  }

  // Handle /admin path redirect
  if (location.pathname === '/admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Handle old upload questions path redirect
  if (location.pathname === '/admin/questions/upload') {
    return <Navigate to="/admin/upload-questions" replace />;
  }

  // If not authenticated, redirect to login with return path
  if (!isAuthenticated || adminError === 'Authentication required' || adminError === 'Please log in again') {
    console.log('AdminRoute: Not authenticated, redirecting to login');
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location.pathname === '/admin' ? '/admin/dashboard' : location.pathname,
          message: adminError || 'Please log in to access the admin area'
        }} 
        replace 
      />
    );
  }

  // If not admin, redirect to dashboard with message
  if (!isAdmin) {
    console.log('AdminRoute: Not admin, redirecting to dashboard');
    return (
      <Navigate 
        to="/dashboard" 
        state={{ 
          message: 'You do not have permission to access the admin area'
        }} 
        replace 
      />
    );
  }

  // If authenticated and admin, render the child routes
  console.log('AdminRoute: Rendering admin routes');
  return <Outlet />;
};

export default AdminRoute;
