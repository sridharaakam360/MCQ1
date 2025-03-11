const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getPerformance,
  getRecentTests,
  getSubjectPerformance
} = require('../controllers/dashboardController');

// All routes are protected and require authentication
router.use(protect);

// User dashboard routes
router.get('/performance', getPerformance);
router.get('/recent-tests', getRecentTests);
router.get('/subject-performance', getSubjectPerformance);

module.exports = router; 