import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Visibility, VisibilityOff, LockOutlined } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const ResetPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword } = useAuth();

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        )
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Confirm password is required'),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      try {
        if (!token) {
          setError('Reset token is missing. Please request a new password reset link.');
          return;
        }
        
        await resetPassword(token, values.password);
        
        setSuccess('Password has been reset successfully! Redirecting to sign in...');
        setTimeout(() => {
          navigate('/signin');
        }, 3000);
      } catch (error) {
        console.error('Error resetting password:', error);
        setError(
          error.response?.data?.message || 
          'Failed to reset password. Please try again or request a new reset link.'
        );
      } finally {
        setIsLoading(false);
      }
    },
  });

  if (!token) {
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
            Invalid Reset Link
          </Typography>

          <Typography variant="body1" align="center" sx={{ mb: 3 }}>
            This password reset link is invalid or has expired. Please request a new password reset link.
          </Typography>

          <Button
            component={RouterLink}
            to="/forgot-password"
            fullWidth
            variant="contained"
            sx={{ py: 1.2 }}
          >
            Request New Reset Link
          </Button>
        </Paper>
      </Container>
    );
  }

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
          Reset Password
        </Typography>

        <Typography variant="body1" align="center" sx={{ mb: 3 }}>
          Please enter your new password below.
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
            id="password"
            name="password"
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            disabled={isLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
            helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
            disabled={isLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
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
                Resetting...
              </Box>
            ) : (
              'Reset Password'
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

export default ResetPassword;
