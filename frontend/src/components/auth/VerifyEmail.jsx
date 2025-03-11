import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Container, Paper, Typography, Box, Button, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

const VerifyEmail = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useParams();

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        const response = await apiService.auth.verifyEmail(token);
        setSuccess(response.data.message || 'Email verified successfully!');
        
        // Redirect to signin after 3 seconds
        setTimeout(() => {
          navigate('/signin');
        }, 3000);
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to verify email. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await apiService.auth.resendVerification({ email: user.email });
      setSuccess(response.data.message || 'Verification email has been resent. Please check your inbox.');
      
      // For development, show the verification link
      if (process.env.NODE_ENV === 'development' && response.data.verificationToken) {
        console.info('Development verification link:', `/verify-email/${response.data.verificationToken}`);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // If we're verifying a token, show a different UI
  if (token) {
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
          <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
            Email Verification
          </Typography>

          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress />
              <Typography>Verifying your email...</Typography>
            </Box>
          ) : error ? (
            <Box sx={{ width: '100%' }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate('/signin')}
                sx={{ mt: 2 }}
              >
                Back to Sign In
              </Button>
            </Box>
          ) : (
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Redirecting to sign in page...
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    );
  }

  // Regular verification page UI
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
        <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          Verify Your Email
        </Typography>

        <Typography variant="body1" align="center" sx={{ mb: 3 }}>
          We've sent a verification email to <strong>{user?.email}</strong>.<br />
          Please check your inbox and click the verification link to activate your account.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
          <Button
            variant="contained"
            onClick={handleResendVerification}
            disabled={isLoading}
            sx={{ py: 1.2, fontWeight: 'bold' }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Sending...
              </Box>
            ) : (
              'Resend Verification Email'
            )}
          </Button>

          <Button
            variant="outlined"
            onClick={handleLogout}
            sx={{ py: 1.2 }}
          >
            Sign Out
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default VerifyEmail;
