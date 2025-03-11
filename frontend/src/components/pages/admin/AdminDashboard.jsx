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
  Button
} from '@mui/material';
import {
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  PersonAdd as PersonAddIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';

const MotionPaper = motion(Paper);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiService.admin.getDashboardStats();

        if (!response?.data?.success) {
          throw new Error('Failed to fetch dashboard data');
        }

        setDashboardData(response.data.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
        <Alert severity="error">{error}</Alert>
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
      onClick: () => navigate('/admin/questions/upload')
    },
    {
      title: 'View Users',
      icon: <PeopleIcon />,
      onClick: () => navigate('/admin/users')
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Admin Dashboard
          </Typography>

          {/* Quick Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
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
              <Card>
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
              <Card>
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
              <Card>
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
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              {quickActions.map((action) => (
                <Grid item xs={12} sm={4} key={action.title}>
                  <Button
                    variant="outlined"
                    startIcon={action.icon}
                    onClick={action.onClick}
                    fullWidth
                  >
                    {action.title}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Recent Users and Test Statistics */}
          <Grid container spacing={3}>
            {/* Recent Users */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Users
                  </Typography>
                  <List>
                    {dashboardData.recentUsers?.map((user, index) => (
                      <React.Fragment key={user.id}>
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
                    ))}
                    {(!dashboardData.recentUsers || dashboardData.recentUsers.length === 0) && (
                      <ListItem>
                        <ListItemText
                          primary="No recent users"
                          secondary="New user data will appear here"
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Test Statistics */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Test Statistics by Subject
                  </Typography>
                  <List>
                    {dashboardData.subjectStats?.map((stat, index) => (
                      <React.Fragment key={stat.subject}>
                        <ListItem>
                          <ListItemText
                            primary={stat.subject}
                            secondary={
                              <>
                                <Typography component="span" variant="body2">
                                  Total Tests: {stat.totalTests || 0}
                                </Typography>
                                <br />
                                <Typography component="span" variant="body2">
                                  Average Score: {stat.averageScore || 0}%
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                        {index < (dashboardData.subjectStats?.length || 0) - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                    {(!dashboardData.subjectStats || dashboardData.subjectStats.length === 0) && (
                      <ListItem>
                        <ListItemText
                          primary="No test statistics available"
                          secondary="Test data will appear here once users start taking tests"
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </MotionPaper>
    </Container>
  );
};

export default AdminDashboard;