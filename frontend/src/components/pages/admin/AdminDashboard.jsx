import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  PersonAdd as PersonAddIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';

const MotionPaper = motion(Paper);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      totalTests: 0,
      averageScore: 0
    },
    recentUsers: [],
    subjectStats: []
  });

  // Function to handle common error scenarios
  const handleError = (err) => {
    console.error('Dashboard error:', err);
    let errorMessage = 'Failed to load dashboard data';
    let shouldRedirect = false;
    let redirectPath = '';

    if (err.response) {
      switch (err.response.status) {
        case 401:
          errorMessage = 'Your session has expired. Please log in again.';
          shouldRedirect = true;
          redirectPath = '/login';
          break;
        case 403:
          errorMessage = 'You do not have permission to access the admin dashboard.';
          shouldRedirect = true;
          redirectPath = '/dashboard';
          break;
        case 404:
          errorMessage = 'Dashboard data not found.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = err.response.data?.message || errorMessage;
      }
    }

    setError(errorMessage);

    if (shouldRedirect) {
      setTimeout(() => {
        navigate(redirectPath, { 
          state: { message: errorMessage }
        });
      }, 2000);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.admin.getDashboardStats();
      
      if (response?.data?.success) {
        setDashboardData(response.data.data);
      } else {
        throw new Error(response?.data?.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  const quickActions = [
    {
      title: 'Add New User',
      icon: <PersonAddIcon />,
      onClick: () => navigate('/admin/users/new')
    },
    {
      title: 'Upload Questions',
      icon: <UploadIcon />,
      onClick: () => navigate('/admin/upload-questions')
    },
    {
      title: 'View Users',
      icon: <PeopleIcon />,
      onClick: () => navigate('/admin/users')
    },
    {
      title: 'View Analytics',
      icon: <AssessmentIcon />,
      onClick: () => navigate('/admin/stats')
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        elevation={3}
        sx={{ p: 3, mb: 4 }}
      >
        {/* Quick Stats */}
        <Typography variant="h6" gutterBottom>
          Overview
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Users</Typography>
                </Box>
                <Typography variant="h4">
                  {dashboardData.stats?.totalUsers || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Tests</Typography>
                </Box>
                <Typography variant="h4">
                  {dashboardData.stats?.totalTests || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Average Score</Typography>
                </Box>
                <Typography variant="h4">
                  {dashboardData.stats?.averageScore || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Active Users</Typography>
                </Box>
                <Typography variant="h4">
                  {dashboardData.stats?.activeUsers || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {quickActions.map((action) => (
            <Grid item xs={12} sm={4} key={action.title}>
              <Button
                variant="outlined"
                startIcon={action.icon}
                onClick={action.onClick}
                fullWidth
                sx={{ py: 1.5 }}
              >
                {action.title}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Recent Users */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Users
                </Typography>
                <List>
                  {dashboardData.recentUsers?.length > 0 ? (
                    dashboardData.recentUsers.map((user, index) => (
                      <React.Fragment key={user.id || index}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar>{user.first_name?.[0] || user.email?.[0] || 'U'}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${user.first_name || ''} ${user.last_name || ''} ${!user.first_name && !user.last_name ? user.email : ''}`}
                            secondary={new Date(user.created_at).toLocaleDateString()}
                          />
                        </ListItem>
                        {index < (dashboardData.recentUsers?.length || 0) - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary="No recent users"
                        secondary="New user data will appear here"
                      />
                    </ListItem>
                  )}
                </List>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="text" 
                    onClick={() => navigate('/admin/users')}
                    endIcon={<PeopleIcon />}
                  >
                    View All Users
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </MotionPaper>
    </Container>
  );
};

export default AdminDashboard;
