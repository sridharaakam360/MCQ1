import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const apiService = {
  auth: {
    login: (credentials) => api.post('/auth/signin', credentials),
    register: (userData) => api.post('/auth/signup', userData),
    logout: () => api.post('/auth/signout'),
    getProfile: () => api.get('/auth/me'),
    updateProfile: (profileData) => api.put('/auth/profile', profileData),
    getCurrentUser: () => api.get('/auth/me'),
    refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    verifyEmail: (token) => api.post('/auth/verify-email', { token })
  },
  user: {
    getPerformance: () => api.get('/users/performance/stats'),
    getTestHistory: () => api.get('/users/tests/history'),
    getTestById: (id) => api.get(`/users/tests/history/${id}`),
    getPerformanceHistory: () => api.get('/users/performance/history'),
    getTestPerformance: (testId) => api.get(`/users/performance/test/${testId}`),
    getProfile: () => api.get('/users/profile'),
    updateProfile: (profileData) => api.put('/users/profile', profileData),
    getSettings: () => api.get('/users/settings'),
    updateSettings: (settings) => api.put('/users/settings', settings),
    deleteAccount: () => api.delete('/users/account')
  },
  test: {
    getQuestions: (filters) => api.get('/tests/questions', { params: filters }),
    submit: (answers) => api.post('/tests/submit', answers),
    getById: (id) => api.get(`/tests/${id}`),
    getResults: (id) => api.get(`/tests/results/${id}`),
    getFilters: () => api.get('/tests/filters'),
    getHistory: (userId) => api.get(`/tests/history${userId ? `/${userId}` : ''}`),
    getStats: () => api.get('/tests/stats')
  },
  admin: {
    getUsers: (params) => api.get('/admin/users', { params }),
    createUser: (userData) => api.post('/admin/users', userData),
    updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),
    getDashboardStats: () => api.get('/admin/dashboard'),
    uploadQuestions: (formData) => api.post('/admin/questions/upload', formData),
    getQuestionTemplate: () => api.get('/admin/questions/template', {
      responseType: 'blob'
    }),
    exportReport: (type) => api.get(`/admin/reports/export/${type}`, {
      responseType: 'blob'
    })
  }
};

export default apiService; 