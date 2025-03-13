import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

// Layout Components
import Navbar from './components/layout/Navbar';
import ProtectedLayout from './components/layout/ProtectedLayout';
import AdminRoute from './components/routes/AdminRoute';
import RealTimeNotifications from './components/common/RealTimeNotifications';

// Auth Pages
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import VerifyEmail from './components/auth/VerifyEmail';

// User Pages
import UserDashboard from './components/pages/user/Dashboard';
import TestResult from './components/pages/user/TestResult';
import MCQTest from './components/pages/user/MCQTest';
import Profile from './components/pages/user/Profile';
import Settings from './components/pages/user/Settings';

// Admin Pages
import AdminDashboard from './components/pages/admin/AdminDashboard';
import UsersList from './components/pages/admin/UsersList';
import UserForm from './components/pages/admin/UserForm';
import Analytics from './components/pages/admin/Analytics';
import UploadQuestions from './components/pages/admin/UploadQuestions';

// Public Pages
import Home from './components/pages/public/Home';
import Syllabus from './components/pages/public/Syllabus';
import About from './components/pages/public/About';
import Contact from './components/pages/public/Contact';
import AccountSuspended from './components/pages/public/AccountSuspended';

const AppRoutes = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <>
      <Navbar />
      <RealTimeNotifications />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/syllabus" element={<Syllabus />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/account-suspended" element={<AccountSuspended />} />
        
        {/* Auth Routes */}
        <Route path="/signin" element={
          isAuthenticated ? <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} /> : <SignIn />
        } />
        <Route path="/signup" element={
          isAuthenticated ? <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} /> : <SignUp />
        } />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />

        {/* User Routes */}
        <Route element={<ProtectedLayout isAuthenticated={isAuthenticated} isAdmin={isAdmin} isLoading={loading} />}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/test" element={<MCQTest />} />
          <Route path="/test-result/:testId" element={<TestResult />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersList />} />
          <Route path="/admin/users/new" element={<UserForm />} />
          <Route path="/admin/users/:userId/edit" element={<UserForm />} />
          <Route path="/admin/stats" element={<Analytics />} />
          <Route path="/admin/upload-questions" element={<UploadQuestions />} />
          <Route path="/admin/questions/upload" element={<Navigate to="/admin/upload-questions" replace />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

const App = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <AuthProvider>
      <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        <WebSocketProvider>
          <AppRoutes />
        </WebSocketProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
