import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import theme from './theme';

// Import your components here
import ProtectedLayout from './components/layout/ProtectedLayout';
import Login from './components/pages/auth/Login';
import Register from './components/pages/auth/Register';
import Dashboard from './components/pages/user/Dashboard';
import MCQTest from './components/pages/user/MCQTest';
import TestResult from './components/pages/user/TestResult';
import Profile from './components/pages/user/Profile';
import AdminDashboard from './components/pages/admin/AdminDashboard';
import UserForm from './components/pages/admin/UserForm';
import QuestionUpload from './components/pages/admin/QuestionUpload';
import UsersList from './components/pages/admin/UsersList';
import PrivateRoute from './components/routes/PrivateRoute';
import AdminRoute from './components/routes/AdminRoute';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected user routes */}
            <Route path="/" element={<PrivateRoute><ProtectedLayout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="test" element={<MCQTest />} />
              <Route path="result/:resultId" element={<TestResult />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Protected admin routes */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route element={<ProtectedLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UsersList />} />
                <Route path="users/new" element={<UserForm />} />
                <Route path="users/:id/edit" element={<UserForm />} />
                <Route path="questions/upload" element={<QuestionUpload />} />
              </Route>
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 