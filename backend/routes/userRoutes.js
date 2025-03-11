const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
  getTestHistory,
  getTestById,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getPerformanceStats,
  getPerformanceHistory,
  deleteAccount,
  getTestPerformance
} = require('../controllers/userController');

// Profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Settings routes
router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);

// Test history routes
router.get('/tests/history', protect, getTestHistory);
router.get('/tests/history/:id', protect, getTestById);

// User management routes
router.get('/users', protect, getAllUsers);
router.get('/users/:id', protect, getUserById);
router.put('/users/:id', protect, updateUser);
router.delete('/users/:id', protect, deleteUser);

// Performance routes
router.get('/performance/stats', protect, getPerformanceStats);
router.get('/performance/history', protect, getPerformanceHistory);
router.get('/performance/test/:testId', protect, getTestPerformance);

// Account management
router.delete('/account', protect, deleteAccount);

module.exports = router;