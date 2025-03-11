const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const path = require('path');
const { 
  getUsers, 
  getUserById,
  createUser,
  getAnalytics,
  exportReport,
  getDashboardOverview,
  getPerformanceAnalytics,
  getSubjects,
  manageSubject,
  getTestStats,
  getUserStats,
  getPerformanceStats,
  updateUserStatus,
  uploadQuestions,
  updateUser,
  deleteUser,
  getQuestionTemplate,
  getDashboardStats
} = require('../controllers/adminController');

// Dashboard routes
router.get('/dashboard', protect, authorizeAdmin, getDashboardStats);

// User management routes
router.get('/users', protect, authorizeAdmin, getUsers);
router.get('/users/:id', protect, authorizeAdmin, getUserById);
router.post('/users', protect, authorizeAdmin, createUser);
router.patch('/users/:id/status', protect, authorizeAdmin, updateUserStatus);
router.put('/users/:id', protect, authorizeAdmin, updateUser);
router.delete('/users/:id', protect, authorizeAdmin, deleteUser);

// Analytics routes
router.get('/analytics', protect, authorizeAdmin, getAnalytics);
router.get('/reports/export', protect, authorizeAdmin, exportReport);
router.get('/overview', protect, authorizeAdmin, getDashboardOverview);
router.get('/performance', protect, authorizeAdmin, getPerformanceAnalytics);

// Subject management routes
router.get('/subjects', protect, authorizeAdmin, getSubjects);
router.post('/subjects', protect, authorizeAdmin, manageSubject);
router.put('/subjects/:id', protect, authorizeAdmin, manageSubject);

// Stats routes
router.get('/stats/tests', protect, authorizeAdmin, getTestStats);
router.get('/stats/users', protect, authorizeAdmin, getUserStats);
router.get('/stats/performance', protect, authorizeAdmin, getPerformanceStats);

// Question management
router.get('/questions/template', protect, authorizeAdmin, getQuestionTemplate);
router.post('/questions/upload', protect, authorizeAdmin, upload.single('file'), uploadQuestions);

module.exports = router;