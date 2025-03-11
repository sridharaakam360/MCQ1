import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Snackbar, Alert, Stack, Slide } from '@mui/material';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useTheme } from '@mui/material/styles';

const MAX_NOTIFICATIONS = 3;
const NOTIFICATION_DURATION = 6000;
const RECONNECTION_CHECK_INTERVAL = 30000;

const RealTimeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const { on, off, isConnected, error, reconnecting } = useWebSocket();
  const theme = useTheme();
  const connectionWatcherRef = useRef(null);
  const notificationTimeoutsRef = useRef([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      notificationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      if (connectionWatcherRef.current) {
        clearInterval(connectionWatcherRef.current);
      }
    };
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Clear the timeout for this notification
    notificationTimeoutsRef.current = notificationTimeoutsRef.current.filter(
      t => t.id !== id
    );
  }, []);

  const addNotification = useCallback((notification) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setNotifications(prev => {
      // Check for duplicate notifications within the last second
      const isDuplicate = prev.some(n => 
        n.message === notification.message && 
        Date.now() - n.timestamp < 1000
      );
      
      if (isDuplicate) return prev;

      // Remove oldest notifications if we exceed MAX_NOTIFICATIONS
      const newNotifications = [
        { 
          ...notification, 
          id, 
          timestamp: Date.now(),
          read: false 
        },
        ...prev
      ].slice(0, MAX_NOTIFICATIONS);

      return newNotifications;
    });

    // Store timeout reference for cleanup
    const timeoutId = setTimeout(() => removeNotification(id), NOTIFICATION_DURATION);
    notificationTimeoutsRef.current.push({ id, timeoutId });

    // Return the notification ID for potential manual removal
    return id;
  }, [removeNotification]);

  const handleNotification = useCallback((data) => {
    addNotification({
      message: data.message,
      type: data.type || 'info',
      title: data.title,
      action: data.action
    });
  }, [addNotification]);

  const handleConnectionStatus = useCallback(() => {
    if (!isConnected && !reconnecting) {
      addNotification({
        message: error || 'Connection lost. Attempting to reconnect...',
        type: 'warning',
        title: 'Connection Status'
      });
    } else if (isConnected && notifications.some(n => n.type === 'warning' && n.message.includes('Connection lost'))) {
      addNotification({
        message: 'Connected successfully',
        type: 'success',
        title: 'Connection Status'
      });
    }
  }, [isConnected, reconnecting, error, addNotification, notifications]);

  useEffect(() => {
    // Subscribe to different notification types
    const subscriptions = [
      on('PERFORMANCE_UPDATED', data => handleNotification({ ...data, title: 'Performance Update' })),
      on('TEST_STATUS_UPDATED', data => handleNotification({ ...data, title: 'Test Status' })),
      on('USER_STATUS_UPDATED', data => handleNotification({ ...data, title: 'User Status' })),
      on('TEST_COMPLETED', data => handleNotification({ ...data, title: 'Test Completed' })),
      on('CONNECTION_ERROR', data => handleNotification({ ...data, title: 'Connection Error', type: 'error' })),
    ];

    // Watch connection status changes
    handleConnectionStatus();
    connectionWatcherRef.current = setInterval(handleConnectionStatus, RECONNECTION_CHECK_INTERVAL);

    return () => {
      // Cleanup subscriptions
      subscriptions.forEach(unsubscribe => unsubscribe());
      if (connectionWatcherRef.current) {
        clearInterval(connectionWatcherRef.current);
      }
    };
  }, [on, handleNotification, handleConnectionStatus]);

  const handleClose = useCallback((id) => (event, reason) => {
    if (reason === 'clickaway') return;
    removeNotification(id);
  }, [removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        top: theme.spacing(3),
        right: theme.spacing(3),
        zIndex: theme.zIndex.snackbar,
        maxWidth: '100%',
        width: 'auto',
      }}
    >
      {notifications.map((notification, index) => (
        <Slide
          key={notification.id}
          direction="left"
          in={true}
          mountOnEnter
          unmountOnExit
        >
          <Snackbar
            open={true}
            onClose={handleClose(notification.id)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{ 
              position: 'relative',
              mt: index > 0 ? 1 : 0,
              '& .MuiAlert-root': {
                width: '100%',
                minWidth: '300px',
                maxWidth: '500px'
              }
            }}
          >
            <Alert
              onClose={handleClose(notification.id)}
              severity={notification.type}
              variant="filled"
              elevation={6}
              sx={{
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
            >
              {notification.title && (
                <strong style={{ display: 'block', marginBottom: '4px' }}>
                  {notification.title}
                </strong>
              )}
              {notification.message}
              {notification.action && (
                <div style={{ marginTop: '8px' }}>
                  {notification.action}
                </div>
              )}
            </Alert>
          </Snackbar>
        </Slide>
      ))}
    </Stack>
  );
};

export default RealTimeNotifications; 