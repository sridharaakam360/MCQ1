import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Check if user is already logged in from localStorage
const getInitialAuthState = () => {
  try {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && refreshToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (!user || !user.id) {
          throw new Error('Invalid user data');
        }
        return user;
      } catch (e) {
        console.error('Error parsing stored user:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
    return null;
  } catch (error) {
    console.error('Error retrieving auth state:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTokenRefreshing, setIsTokenRefreshing] = useState(false);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      setIsTokenRefreshing(true);
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.auth.refreshToken(refreshToken);
      const { token, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      return token;
    } catch (error) {
      clearAuthData();
      throw error;
    } finally {
      setIsTokenRefreshing(false);
    }
  }, [clearAuthData]);

  const validateToken = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return false;
      }

      const response = await apiService.auth.getCurrentUser();
      
      if (response?.data?.success && response?.data?.data?.user) {
        const userData = response.data.data.user;
        // Ensure isActive is set
        const userToStore = {
          ...userData,
          isActive: userData.isActive ?? true // Default to true if not provided
        };
        setUser(userToStore);
        return true;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await apiService.auth.getProfile();
        if (response?.data?.success) {
          setUser(response.data.data);
        } else {
          localStorage.removeItem('token');
        }
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
      
      if (response?.data?.success) {
        const { token, user: userData } = response.data;
        localStorage.setItem('token', token);
        setUser(userData);
        return true;
      } else {
        throw new Error(response?.data?.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.message || 'Login failed');
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
      const { token, refreshToken, user: newUser } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      setUser(newUser);
      return { success: true, user: newUser };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await apiService.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
      setLoading(false);
    }
  };

  const updateUser = (data) => {
    setUser(prev => {
      const updated = { ...prev, ...data };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.auth.forgotPassword(email);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send reset email. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.auth.resetPassword({ token, newPassword });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password reset failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (token) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.auth.verifyEmail(token);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Email verification failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: loading,
        isAdmin: user?.isAdmin,
        error,
        isTokenRefreshing,
        login,
        logout,
        register,
        updateUser,
        resetPassword,
        verifyEmail,
        refreshToken,
        forgotPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};