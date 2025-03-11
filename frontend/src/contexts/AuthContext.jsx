import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Auth Check - Token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await apiService.auth.getCurrentUser();
      console.log('Auth Check - User Data:', response?.data?.data);
      
      if (response?.data?.success) {
        setUser(response.data.data);
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.auth.login(credentials);
      console.log('Login Response:', response?.data);
      
      if (response?.data?.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.auth.register(userData);
      
      if (response?.data?.success) {
        return response.data;
      }
      throw new Error(response?.data?.message || 'Registration failed');
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    login,
    register,
    logout,
    checkAuth
  };

  console.log('Auth Context State:', {
    isAuthenticated: value.isAuthenticated,
    isAdmin: value.isAdmin,
    loading: value.loading,
    user: value.user
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 