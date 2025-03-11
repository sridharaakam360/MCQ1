import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Prompt } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import apiService from '../../../services/api';
import debounce from 'lodash/debounce';

const FORM_STORAGE_KEY = 'editUserFormData';

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    isAdmin: false,
    newPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [originalData, setOriginalData] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiService.admin.getUserById(id);
        
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to fetch user');
        }
        
        const user = response.data.data;
        const userData = {
          username: user.username || '',
          email: user.email || '',
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          isAdmin: user.is_admin || false,
          newPassword: '',
        };
        
        setFormData(userData);
        setOriginalData(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
        setError('Failed to fetch user details.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  useEffect(() => {
    if (originalData) {
      const hasChanges = Object.keys(formData).some(key => {
        if (key === 'newPassword') return false; // Ignore password field
        return formData[key] !== originalData[key];
      });
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, originalData]);

  // Load saved form data from localStorage
  useEffect(() => {
    const savedForm = localStorage.getItem(`${FORM_STORAGE_KEY}_${id}`);
    if (savedForm) {
      const parsedForm = JSON.parse(savedForm);
      setFormData(parsedForm);
    }
  }, [id]);

  // Auto-save form data
  const autoSave = useCallback(
    debounce(async (data) => {
      try {
        setAutoSaveStatus('Saving...');
        const response = await apiService.admin.updateUser(id, {
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          is_admin: data.isAdmin
        });

        if (response.data.success) {
          setAutoSaveStatus('All changes saved');
          setLastSaved(new Date());
          // Update localStorage
          localStorage.setItem(`${FORM_STORAGE_KEY}_${id}`, JSON.stringify(data));
        } else {
          setAutoSaveStatus('Failed to save');
        }
      } catch (error) {
        console.error('Auto-save error:', error);
        setAutoSaveStatus('Failed to save');
      }
    }, 1000),
    [id]
  );

  // Clear form data from localStorage on successful submit
  const clearSavedForm = () => {
    localStorage.removeItem(`${FORM_STORAGE_KEY}_${id}`);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (formData.newPassword) {
      if (formData.newPassword.length < 8) {
        errors.newPassword = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
        errors.newPassword = 'Password must contain uppercase, lowercase, and numbers';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: name === 'isAdmin' ? checked : value
    };
    setFormData(newFormData);
    
    // Clear error when field is modified
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Trigger auto-save for non-sensitive fields
    if (name !== 'newPassword') {
      autoSave(newFormData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        is_admin: formData.isAdmin
      };

      if (formData.newPassword) {
        userData.password = formData.newPassword;
      }

      const response = await apiService.admin.updateUser(id, userData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update user');
      }
      
      setSuccess('User updated successfully');
      setHasUnsavedChanges(false);
      setOriginalData(formData);
      clearSavedForm();
      
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
      
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setSaving(true);
      const response = await apiService.admin.resetUserPassword(id);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to reset password');
      }
      
      setSuccess('Password reset email sent to user');
      setResetDialogOpen(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setDiscardDialogOpen(true);
    } else {
      navigate('/admin/users');
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Edit User
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        {autoSaveStatus && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {autoSaveStatus}
            </Typography>
            {lastSaved && (
              <Typography variant="caption" color="text.secondary">
                Last saved: {lastSaved.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                margin="normal"
                disabled // Username shouldn't be editable
                error={!!formErrors.username}
                helperText={formErrors.username}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                error={!!formErrors.email}
                helperText={formErrors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Password Management
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleChange}
                  error={!!formErrors.newPassword}
                  helperText={formErrors.newPassword || 'Leave blank to keep current password'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<KeyIcon />}
                  onClick={() => setResetDialogOpen(true)}
                >
                  Reset Password
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isAdmin}
                    onChange={handleChange}
                    name="isAdmin"
                    color="primary"
                  />
                }
                label="Admin User"
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Password Reset Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
      >
        <DialogTitle>Reset User Password</DialogTitle>
        <DialogContent>
          This will send a password reset email to the user's email address.
          Are you sure you want to proceed?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handlePasswordReset}
            color="primary"
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Send Reset Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discard Changes Dialog */}
      <Dialog
        open={discardDialogOpen}
        onClose={() => setDiscardDialogOpen(false)}
      >
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          You have unsaved changes. Are you sure you want to discard them?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardDialogOpen(false)}>
            Continue Editing
          </Button>
          <Button
            onClick={() => navigate('/admin/users')}
            color="error"
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prompt for unsaved changes */}
      <Prompt
        when={hasUnsavedChanges}
        message="You have unsaved changes. Are you sure you want to leave?"
      />
    </Container>
  );
};

export default EditUser; 