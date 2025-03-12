const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getAllQuestions, 
    getQuestionsByFilters,
    calculateTestTime 
} = require('../controllers/questionController');

// TODO: Import question controller functions
// const { } = require('../controllers/questionController');

// Question retrieval routes
router.get('/', protect, getAllQuestions);
router.get('/filter', protect, getQuestionsByFilters);

// Test time calculation route
router.post('/calculate-time', protect, calculateTestTime);

// Define routes here
// Example:
// router.get('/', protect, getAllQuestions);
// router.post('/', protect, createQuestion);
// router.get('/:id', protect, getQuestionById);
// router.put('/:id', protect, updateQuestion);
// router.delete('/:id', protect, deleteQuestion);

module.exports = router;
