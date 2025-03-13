import React, { useState, useCallback, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Button,
  Avatar,
  Divider,
  ListItemIcon,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Fade
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Person,
  ExitToApp,
  Settings,
  Assessment,
  QuestionAnswer,
  SupervisorAccount,
  Notifications,
  Home,
  Book,
  Info,
  ContactSupport,
  AccountCircle
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { safeFirstChar } from '../../utils/stringUtils';

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout, isAuthenticated } = useAuth();
  const { isConnected } = useWebSocket();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    console.log('Navbar State:', {
      isAuthenticated,
      isAdmin,
      user,
      currentPath: location.pathname
    });
  }, [isAuthenticated, isAdmin, user, location]);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
    setUnreadNotifications(0);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchor(null);
    setNotificationsAnchor(null);
  };

  const handleLogout = async () => {
    try {
      handleMenuClose();
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = useCallback((path) => {
    try {
      console.log('Navigation Attempt:', {
        path,
        isAdmin,
        currentPath: location.pathname
      });

      // Handle admin routes
      if (path.startsWith('/admin')) {
        if (!isAdmin) {
          console.warn('Unauthorized admin route access attempt');
          return;
        }
        handleMenuClose();
        navigate(path, { state: { from: location.pathname } });
        return;
      }

      // Handle regular routes
      handleMenuClose();
      navigate(path, { state: { from: location.pathname } });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [navigate, isAdmin, location]);

  const publicPages = [
    { title: 'Home', path: '/', icon: <Home /> },
    { title: 'Syllabus', path: '/syllabus', icon: <Book /> },
    { title: 'About', path: '/about', icon: <Info /> },
    { title: 'Contact', path: '/contact', icon: <ContactSupport /> }
  ];

  const adminPages = [
    { title: 'Dashboard', path: '/admin', icon: <Dashboard /> },
    { title: 'Upload Questions', path: '/admin/questions/upload', icon: <QuestionAnswer /> },
    { title: 'Manage Users', path: '/admin/users', icon: <SupervisorAccount /> }
  ];

  const userPages = [
    { title: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
    { title: 'Take Test', path: '/test', icon: <QuestionAnswer /> }
  ];

  const isCurrentPath = (path) => {
    // Special handling for admin routes
    if (path.startsWith('/admin')) {
      const normalizedPath = path === '/admin' ? '/admin/dashboard' : path;
      return location.pathname === normalizedPath;
    }
    return location.pathname === path;
  };

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      onClick={handleMenuClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      TransitionComponent={Fade}
    >
      <MenuItem onClick={() => handleNavigation('/profile')}>
        <ListItemIcon>
          <Person fontSize="small" />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem onClick={() => handleNavigation('/settings')}>
        <ListItemIcon>
          <Settings fontSize="small" />
        </ListItemIcon>
        Settings
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <ExitToApp fontSize="small" />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );

  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMenuAnchor}
      open={Boolean(mobileMenuAnchor)}
      onClose={handleMenuClose}
      onClick={handleMenuClose}
      TransitionComponent={Fade}
    >
      {publicPages.map((page) => (
        <MenuItem 
          key={page.path} 
          onClick={() => handleNavigation(page.path)}
          selected={isCurrentPath(page.path)}
        >
          <ListItemIcon>{page.icon}</ListItemIcon>
          {page.title}
        </MenuItem>
      ))}
      {isAuthenticated && (
        <>
          <Divider />
          {(isAdmin ? adminPages : userPages).map((page) => (
            <MenuItem 
              key={page.path} 
              onClick={() => handleNavigation(page.path)}
              selected={isCurrentPath(page.path)}
            >
              <ListItemIcon>{page.icon}</ListItemIcon>
              {page.title}
            </MenuItem>
          ))}
          <Divider />
          <MenuItem onClick={() => handleNavigation('/profile')}>
            <ListItemIcon><AccountCircle /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon><ExitToApp /></ListItemIcon>
            Logout
          </MenuItem>
        </>
      )}
    </Menu>
  );

  const renderNotificationsMenu = (
    <Menu
      anchorEl={notificationsAnchor}
      open={Boolean(notificationsAnchor)}
      onClose={handleMenuClose}
      onClick={handleMenuClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      TransitionComponent={Fade}
    >
      <MenuItem disabled>No new notifications</MenuItem>
    </Menu>
  );

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        bgcolor: theme.palette.primary.main,
        boxShadow: 3
      }}
    >
      <Toolbar>
        {isMobile && (
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMobileMenuOpen}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ 
            flexGrow: { xs: 1, md: 0 }, 
            mr: 2,
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          onClick={() => handleNavigation('/')}
        >
          GPAT Prep
        </Typography>

        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
          {publicPages.map((page) => (
            <Tooltip key={page.path} title={page.title}>
              <Button
                onClick={() => handleNavigation(page.path)}
                sx={{ 
                  color: 'white',
                  mx: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
                selected={isCurrentPath(page.path)}
                startIcon={page.icon}
              >
                {page.title}
              </Button>
            </Tooltip>
          ))}
          
          {isAuthenticated && (isAdmin ? adminPages : userPages).map((page) => (
            <Tooltip key={page.path} title={page.title}>
              <Button
                onClick={() => handleNavigation(page.path)}
                sx={{ 
                  color: 'white',
                  mx: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
                selected={isCurrentPath(page.path)}
                startIcon={page.icon}
              >
                {page.title}
              </Button>
            </Tooltip>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isAuthenticated && (
            <>
              <Tooltip title="Notifications">
                <IconButton 
                  color="inherit" 
                  onClick={handleNotificationsOpen}
                  sx={{ mr: 1 }}
                >
                  <Badge badgeContent={unreadNotifications} color="error">
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title={user?.username || user?.email || 'Profile'}>
                <IconButton
                  edge="end"
                  onClick={handleProfileMenuOpen}
                  color="inherit"
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: isConnected ? 'success.main' : 'error.main'
                    }}
                  >
                    {safeFirstChar(user?.username) || safeFirstChar(user?.email) || 'U'}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </>
          )}

          {!isAuthenticated && !isMobile && (
            <Button
              color="inherit"
              onClick={() => handleNavigation('/signin')}
              startIcon={<AccountCircle />}
              sx={{ fontWeight: 'bold' }}
            >
              Login
            </Button>
          )}
        </Box>

        {renderMenu}
        {renderMobileMenu}
        {renderNotificationsMenu}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
