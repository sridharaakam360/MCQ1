import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Container, 
  Box, 
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Visibility, VisibilityOff, LockOutlined, EmailOutlined } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

const SignIn = () => {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, error: authError, isAdmin } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = isAdmin ? '/admin/dashboard' : '/dashboard';
      navigate(redirectPath);
    }
  }, [isAuthenticated, isAdmin, navigate]);

  // Set error from auth context
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError('');
      setLoading(true);
      const success = await login(values);
      if (success) {
        const redirectPath = isAdmin ? '/admin/dashboard' : '/dashboard';
        navigate(redirectPath);
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  if (loading) {
    return (
      <Container component="main" maxWidth="xs">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper
        sx={{
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          boxShadow: 2,
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          Sign In to GPAT Prep
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}

        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, handleChange, handleBlur, handleSubmit, errors, touched, isSubmitting }) => (
            <Form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <TextField
                fullWidth
                margin="normal"
                name="email"
                label="Email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.email && Boolean(errors.email)}
                helperText={touched.email && errors.email}
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                margin="normal"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password && Boolean(errors.password)}
                helperText={touched.password && errors.password}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

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
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Link to="/signup" style={{ textDecoration: 'none' }}>
                  {"Don't have an account? Sign Up"}
                </Link>
                <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                  {"Forgot password?"}
                </Link>
              </Box>
            </Form>
          )}
        </Formik>
      </Paper>
    </Container>
  );
};

export default SignIn;
