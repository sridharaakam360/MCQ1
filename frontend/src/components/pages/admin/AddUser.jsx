import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  InputAdornment,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CloudUpload as CloudUploadIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import apiService from '../../../services/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BATCH_SIZE = 50;

const AddUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    isAdmin: false
  });
  const [formErrors, setFormErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [failedUploads, setFailedUploads] = useState([]);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength <= 25) return 'error';
    if (strength <= 50) return 'warning';
    if (strength <= 75) return 'info';
    return 'success';
  };

  const validateForm = async () => {
    const errors = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else {
      // Check for duplicate username
      try {
        const response = await apiService.admin.checkUsername(formData.username);
        if (response.data.exists) {
          errors.username = 'Username already exists';
        }
      } catch (error) {
        console.error('Error checking username:', error);
      }
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email format';
    } else {
      // Check for duplicate email
      try {
        const response = await apiService.admin.checkEmail(formData.email);
        if (response.data.exists) {
          errors.email = 'Email already exists';
        }
      } catch (error) {
        console.error('Error checking email:', error);
      }
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and numbers';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'isAdmin' ? checked : value
    }));
    
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    // Clear error when field is modified
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create user data object
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        is_admin: formData.isAdmin
      };

      // Call API to create user
      const response = await apiService.admin.createUser(userData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create user');
      }
      
      setSuccess('User created successfully');
      
      // Reset form
      setFormData({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        isAdmin: false
      });
      setPasswordStrength(0);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'xlsx') {
      setError('Please upload only Excel (.xlsx) files');
      return;
    }

    setSelectedFile(file);
  };

  const validateFile = (file) => {
    if (!file) return 'No file selected';
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload an Excel file (.xlsx)';
    }

    return null;
  };

  const processUserBatch = async (users, batchIndex) => {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min((batchIndex + 1) * BATCH_SIZE, users.length);
    const batch = users.slice(start, end);
    
    try {
      const response = await apiService.admin.createUsers(batch);
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      return { success: true, count: batch.length };
    } catch (error) {
      return {
        success: false,
        users: batch,
        error: error.message
      };
    }
  };

  const handleBatchUpload = async () => {
    if (!selectedFile) return;

    const fileError = validateFile(selectedFile);
    if (fileError) {
      setError(fileError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setFailedUploads([]);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const users = XLSX.utils.sheet_to_json(worksheet);

          // Validate users
          const errors = [];
          const validUsers = users.filter((user, index) => {
            if (!user.username || !user.email || !user.password) {
              errors.push(`Row ${index + 2}: Missing required fields`);
              return false;
            }
            if (!/\S+@\S+\.\S+/.test(user.email)) {
              errors.push(`Row ${index + 2}: Invalid email format`);
              return false;
            }
            if (user.password.length < 8) {
              errors.push(`Row ${index + 2}: Password too short`);
              return false;
            }
            return true;
          });

          if (errors.length > 0) {
            throw new Error(`Validation errors:\n${errors.join('\n')}`);
          }

          const numBatches = Math.ceil(validUsers.length / BATCH_SIZE);
          setTotalBatches(numBatches);

          for (let i = 0; i < numBatches; i++) {
            setCurrentBatch(i + 1);
            const result = await processUserBatch(validUsers, i);
            
            if (!result.success) {
              setFailedUploads(prev => [...prev, ...result.users]);
            }
            
            setUploadProgress(((i + 1) / numBatches) * 100);
          }

          const successCount = validUsers.length - failedUploads.length;
          setSuccess(`Successfully created ${successCount} users`);
          
          if (failedUploads.length > 0) {
            setError(`Failed to create ${failedUploads.length} users. Check console for details.`);
            console.error('Failed uploads:', failedUploads);
          }

          setUploadDialogOpen(false);
          setSelectedFile(null);
          
          if (successCount > 0) {
            setTimeout(() => {
              navigate('/admin/users');
            }, 2000);
          }
        } catch (error) {
          console.error('Error processing file:', error);
          setError(error.message);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error('Error uploading users:', error);
      setError('Failed to process file');
    } finally {
      setLoading(false);
      setCurrentBatch(0);
      setTotalBatches(0);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        username: 'johndoe',
        email: 'john@example.com',
        password: 'StrongPass123',
        first_name: 'John',
        last_name: 'Doe',
        is_admin: false
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'user_upload_template.xlsx');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Add New User
          </Typography>
          <Tooltip title="Upload multiple users using Excel">
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Batch Upload
            </Button>
          </Tooltip>
        </Box>
        
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
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                error={!!formErrors.password}
                helperText={formErrors.password}
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
              <Box sx={{ mt: 1, mb: 2 }}>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  Password Strength
                  <Tooltip title="Password must be at least 8 characters long and contain uppercase, lowercase, and numbers">
                    <IconButton size="small">
                      <HelpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength}
                  color={getPasswordStrengthColor(passwordStrength)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
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
              onClick={() => navigate('/admin/users')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Create User'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Batch Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !loading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Batch Upload Users</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" paragraph>
              Upload multiple users at once using an Excel file.
              Please ensure your file follows the required format.
            </Typography>
            <Button
              variant="outlined"
              onClick={downloadTemplate}
              sx={{ mb: 2 }}
            >
              Download Template
            </Button>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: '#fafafa',
              transition: 'all 0.3s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            <input
              accept=".xlsx"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
              disabled={loading}
            />
            <label htmlFor="file-upload">
              <Button
                component="span"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                disabled={loading}
              >
                Choose File
              </Button>
            </label>
            {selectedFile && (
              <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                {selectedFile.name}
              </Typography>
            )}
          </Box>
          
          {loading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" align="center" display="block">
                Processing batch {currentBatch} of {totalBatches}
                {uploadProgress > 0 && ` (${Math.round(uploadProgress)}%)`}
              </Typography>
            </Box>
          )}
          
          {failedUploads.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Failed to create {failedUploads.length} users.
              <Button
                size="small"
                onClick={() => {
                  const ws = XLSX.utils.json_to_sheet(failedUploads);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Failed');
                  XLSX.writeFile(wb, 'failed_uploads.xlsx');
                }}
              >
                Download Failed Records
              </Button>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setUploadDialogOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBatchUpload}
            color="primary"
            variant="contained"
            disabled={!selectedFile || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AddUser; 