const express = require('express');
const testController = require('../controllers/testController');
const { protect } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Apply authentication middleware to all routes except public ones
router.use(protect);

/**
 * @route   GET /tests/filters
 * @desc    Get test filters (subjects and years)
 * @access  Private
 */
router.get('/filters', asyncHandler(testController.getTestFilters));

/**
 * @route   GET /tests/questions
 * @desc    Get questions for a test based on filters
 * @access  Private
 */
router.get('/questions', asyncHandler(testController.getTestQuestions));

/**
 * @route   POST /tests/submit
 * @desc    Submit a completed test
 * @access  Private
 */
router.post('/submit', asyncHandler(testController.submitTest));

/**
 * @route   GET /tests/results/:testId
 * @desc    Get test results by test ID
 * @access  Private
 */
router.get('/results/:testId', asyncHandler(testController.getTestResults));

/**
 * @route   GET /tests/history
 * @desc    Get user's test history
 * @access  Private
 */
router.get('/history', asyncHandler(testController.getTestHistory));

/**
 * @route   GET /tests/history/:userId
 * @desc    Get test history for a specific user
 * @access  Private
 */
router.get('/history/:userId', asyncHandler(testController.getTestHistory));

/**
 * @route   GET /tests/stats
 * @desc    Get user's test statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(testController.getTestStats));

module.exports = router;