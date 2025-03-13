import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  // Ensure credentials are sent with requests
  withCredentials: true,
  // Handle CORS preflight
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // Ensure headers object exists
    config.headers = config.headers || {};
    
    // Check if token is required for this request
    const isPublicRoute = config.url === '/auth/signin' || 
                         config.url === '/auth/signup' || 
                         config.url === '/auth/forgot-password';
    
    if (!isPublicRoute && !token) {
      // Token required but not found
      console.error('Token required but not found for:', config.url);
      window.location.href = '/login';
      return Promise.reject(new Error('Authentication required'));
    }

    if (token) {
      // Set Authorization header
      config.headers.Authorization = `Bearer ${token}`;
      
      // Add admin-specific headers for admin routes
      if (config.url?.startsWith('/admin')) {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
          config.headers['X-Admin-Token'] = adminToken;
        }
      }
    }
    
    // Log request details for debugging
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      isAdmin: config.url?.startsWith('/admin')
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Check for token in auth responses
    if (response.config.url === '/auth/signin' && response.data?.token) {
      localStorage.setItem('token', response.data.token);
      console.log('Token saved from login response');
    }
    
    // Log successful responses for debugging
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      success: response.data?.success,
      hasToken: !!localStorage.getItem('token')
    });
    
    return response;
  },
  async (error) => {
    const requestMetadata = error.config?.metadata || {};
    const duration = requestMetadata.startTime ? new Date() - requestMetadata.startTime : null;

    // Log error responses for debugging (remove in production)
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      duration,
      isAdmin: requestMetadata.isAdmin
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Handle forbidden errors (e.g., not admin)
      console.error('Access forbidden. User may not have required permissions.');
      if (requestMetadata.isAdmin) {
        // Clear admin status on forbidden admin requests
        localStorage.removeItem('isAdmin');
      }
    }
    return Promise.reject(error);
  }
);

const apiService = {
  auth: {
    verifyAdmin: async () => {
      try {
        const response = await api.get('/admin/verify');
        if (response.data?.success) {
          localStorage.setItem('adminToken', response.data.data.token || 'verified');
        }
        return response;
      } catch (error) {
        localStorage.removeItem('adminToken');
        throw error;
      }
    },
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
    getStats: () => api.get('/tests/stats'),
    calculateTime: (data) => api.post('/questions/calculate-time', data)
  },
  admin: {
    // User management
    getUsers: (params) => api.get('/admin/users', { 
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Admin-Request': 'true'
      }
    }),
    getUserById: (id) => api.get(`/admin/users/${id}`, {
      headers: { 'X-Admin-Request': 'true' }
    }),
    createUser: (userData) => api.post('/admin/users', userData, {
      headers: { 'X-Admin-Request': 'true' }
    }),
    updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData, {
      headers: { 'X-Admin-Request': 'true' }
    }),
    deleteUser: (id) => api.delete(`/admin/users/${id}`, {
      headers: { 'X-Admin-Request': 'true' }
    }),
    
    // Dashboard and statistics
    getDashboardStats: () => api.get('/admin/dashboard', {
      headers: { 'X-Admin-Request': 'true' }
    }),
    getStats: () => api.get('/admin/stats', {
      headers: { 'X-Admin-Request': 'true' }
    }),
    getAnalytics: (params) => api.get('/admin/analytics', { 
      params,
      headers: { 'X-Admin-Request': 'true' }
    }),
    
    // Questions management
    uploadQuestions: (formData) => api.post('/admin/questions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Admin-Request': 'true'
      }
    }),
    getQuestions: (params) => api.get('/admin/questions', { 
      params,
      headers: { 'X-Admin-Request': 'true' }
    }),
    updateQuestion: (id, questionData) => api.put(`/admin/questions/${id}`, questionData, {
      headers: { 'X-Admin-Request': 'true' }
    }),
    deleteQuestion: (id) => api.delete(`/admin/questions/${id}`, {
      headers: { 'X-Admin-Request': 'true' }
    }),
    
    // Templates and exports
    getQuestionTemplate: () => api.get('/admin/questions/template', {
      responseType: 'blob',
      headers: { 'X-Admin-Request': 'true' }
    }),
    exportReport: (type, params) => api.get(`/admin/reports/export/${type}`, {
      responseType: 'blob',
      params,
      headers: { 'X-Admin-Request': 'true' }
    })
  }
};

export default apiService;
