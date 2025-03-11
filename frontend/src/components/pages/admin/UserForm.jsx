import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../../services/api';

const MotionPaper = motion(Paper);

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    isAdmin: false,
    isVerified: true,
    isActive: true
  });

  useEffect(() => {
    if (isEditMode) {
      fetchUserData();
    }
  }, [isEditMode, id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await apiService.admin.getUsers({ id });
      if (response?.data?.success && response.data.data.users[0]) {
        const user = response.data.data.users[0];
        setFormData({
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isAdmin: user.is_admin,
          isVerified: user.is_verified,
          isActive: user.is_active
        });
      }
    } catch (err) {
      setError('Failed to fetch user data');
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (isEditMode) {
        await apiService.admin.updateUser(id, formData);
        setSuccess('User updated successfully');
      } else {
        await apiService.admin.createUser(formData);
        setSuccess('User created successfully');
      }

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
      console.error('Error saving user:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            {isEditMode ? 'Edit User' : 'Add New User'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={isEditMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              {!isEditMode && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isAdmin"
                      checked={formData.isAdmin}
                      onChange={handleChange}
                    />
                  }
                  label="Admin Access"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isVerified"
                      checked={formData.isVerified}
                      onChange={handleChange}
                    />
                  }
                  label="Verified User"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                    />
                  }
                  label="Active User"
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{ minWidth: 120 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Save'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/admin/users')}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Box>
      </MotionPaper>
    </Container>
  );
};

export default UserForm; 