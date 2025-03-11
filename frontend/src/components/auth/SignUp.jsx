import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { TextField, Button, Paper, Typography, Container, Box, Alert, CircularProgress, Grid } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';

const SignUp = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const navigate = useNavigate();
  const { register } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: ''
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      fullName: Yup.string()
        .required('Full name is required')
        .min(2, 'Full name must be at least 2 characters'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        )
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Confirm password is required')
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      setError('');
      setSuccess('');
      setRateLimitInfo(null);
      
      try {
        const response = await register({
          email: values.email,
          password: values.password,
          fullName: values.fullName
        });

        setSuccess('Sign up successful! Redirecting to sign in...');
        setTimeout(() => {
          navigate('/signin');
        }, 3000);
      } catch (error) {
        console.error('Sign-up error:', error);
        if (error.status === 429) {
          setRateLimitInfo({
            message: error.message,
            retryAfter: error.retryAfter
          });
        } else {
          setError(
            error.response?.data?.message || 
            error.message ||
            'Failed to sign up. Please try again.'
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <Container component="main" maxWidth="xs">
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
          Create Your Account
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

        {rateLimitInfo && (
          <Alert severity="warning" sx={{ width: '100%', mb: 2 }}>
            {rateLimitInfo.message}
            {rateLimitInfo.retryAfter && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please try again in {Math.ceil(rateLimitInfo.retryAfter / 60)} minutes.
              </Typography>
            )}
          </Alert>
        )}

        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3, width: '100%' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="fullName"
                name="fullName"
                label="Full Name"
                value={formik.values.fullName}
                onChange={formik.handleChange}
                error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                helperText={formik.touched.fullName && formik.errors.fullName}
                disabled={isLoading || rateLimitInfo}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email Address"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                disabled={isLoading || rateLimitInfo}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                disabled={isLoading || rateLimitInfo}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                disabled={isLoading || rateLimitInfo}
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: 3, 
              mb: 2,
              py: 1.2,
              fontWeight: 'bold',
              borderRadius: 2
            }}
            disabled={isLoading || rateLimitInfo}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Signing up...
              </Box>
            ) : (
              'Sign Up'
            )}
          </Button>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <RouterLink to="/signin" style={{ textDecoration: 'none' }}>
              Already have an account? Sign In
            </RouterLink>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default SignUp;
