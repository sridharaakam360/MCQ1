import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PrivateRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('PrivateRoute mounted with:', {
      isAuthenticated,
      loading,
      pathname: location.pathname,
      state: location.state,
      search: location.search
    });
  }, [isAuthenticated, loading, location]);

  if (loading) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    // Preserve the attempted URL and state
    return <Navigate to="/login" state={{ from: location.pathname, state: location.state }} replace />;
  }

  console.log('User authenticated, rendering protected route');
  return <Outlet />;
};

export default PrivateRoute; 