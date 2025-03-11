import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { useAuth } from '../../../contexts/AuthContext';
import apiService from '../../../services/api';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({
    emailNotifications: true,
    autoSaveAnswers: true
  });

  const fetchSettings = async () => {
    try {
      const response = await apiService.user.getSettings();
      setSettings(response.data);
      console.log('Settings fetched successfully:', response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to fetch settings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = (setting) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [setting]: !prevSettings[setting],
    }));
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container>
      <Paper>
        <Typography variant="h4">Settings</Typography>

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

        <List>
          <ListItem>
            <ListItemText 
              primary="Email Notifications"
              secondary="Receive email notifications about test results and updates"
            />
            <ListItemSecondaryAction>
              <Switch
                edge="end"
                checked={settings.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
                disabled={loading}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <Divider />
          
          <ListItem>
            <ListItemText 
              primary="Auto Save Answers"
              secondary="Automatically save your answers while taking tests"
            />
            <ListItemSecondaryAction>
              <Switch
                edge="end"
                checked={settings.autoSaveAnswers}
                onChange={() => handleToggle('autoSaveAnswers')}
                disabled={loading}
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
};

export default Settings;