import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Container, 
  Box, 
  Alert, 
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { EmailOutlined } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      try {
        await forgotPassword(values.email);
        setSuccess('Password reset instructions have been sent to your email');
        setTimeout(() => {
          navigate('/signin');
        }, 5000);
      } catch (error) {
        console.error('Error requesting password reset:', error);
        setError(
          error.response?.data?.message || 
          'Failed to request password reset. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
  });

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
          Forgot Password
        </Typography>

        <Typography variant="body1" align="center" sx={{ mb: 3 }}>
          Enter your email address and we'll send you instructions to reset your password.
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

        <Box component="form" onSubmit={formik.handleSubmit} sx={{ width: '100%' }}>
          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email Address"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            disabled={isLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ py: 1.2, mb: 2, fontWeight: 'bold' }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Sending...
              </Box>
            ) : (
              'Send Reset Instructions'
            )}
          </Button>

          <Button
            component={RouterLink}
            to="/signin"
            fullWidth
            variant="outlined"
            disabled={isLoading}
            sx={{ py: 1.2 }}
          >
            Back to Sign In
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
