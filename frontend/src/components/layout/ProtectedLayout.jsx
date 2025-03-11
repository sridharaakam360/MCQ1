import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './Navbar';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedLayout = () => {
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    console.log('ProtectedLayout Mount:', {
      isAuthenticated,
      isAdmin,
      location: location.pathname
    });
  }, [isAuthenticated, isAdmin, location]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          py: 3,
          mt: 8, // Add margin top to account for fixed navbar
          px: { xs: 2, sm: 3, md: 4 } // Add responsive padding
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default ProtectedLayout;