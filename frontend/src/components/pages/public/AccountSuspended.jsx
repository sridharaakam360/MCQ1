import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  Divider
} from '@mui/material';
import { Block as BlockIcon, ContactSupport as ContactSupportIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';

const AccountSuspended = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleContactSupport = () => {
    navigate('/contact');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper
        elevation={6}
        sx={{
          p: 4,
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2
        }}
      >
        <BlockIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
        
        <Typography component="h1" variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          Account Suspended
        </Typography>

        <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
          Your account has been suspended. Please contact support for assistance.
        </Alert>

        <Typography variant="body1" align="center" sx={{ mb: 3 }}>
          If you believe this is a mistake or would like to reactivate your account,
          please contact our support team.
        </Typography>

        <Divider sx={{ width: '100%', my: 3 }} />

        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleContactSupport}
            startIcon={<ContactSupportIcon />}
          >
            Contact Support
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AccountSuspended; 