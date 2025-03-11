const db = require('../config/db').pool;
const { ApiError } = require('../utils/errors');
const { catchAsync } = require('../utils/errors');
const logger = require('../config/logger');

// Get test history for a user
const getTestHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  const [tests] = await db.query(`
    SELECT 
      tr.id,
      tr.created_at as date,
      tr.score,
      tr.total_questions,
      tr.time_taken,
      s.name as subject,
      CONCAT('Test ', tr.id) as name,
      CASE WHEN tr.score >= 70 THEN 'Passed' ELSE 'Failed' END as status
    FROM test_results tr
    LEFT JOIN subjects s ON tr.subject_id = s.id
    WHERE tr.user_id = ?
    ORDER BY tr.created_at DESC
  `, [userId]);

  res.json({
    success: true,
    tests: tests.map(test => ({
      ...test,
      date: test.date.toISOString(),
      score: Math.round(test.score),
      timeTaken: test.time_taken
    }))
  });
});

// Get test statistics for a user
const getTestStats = catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  // Get overall stats
  const [[stats]] = await db.query(`
    SELECT 
      COUNT(*) as totalTests,
      AVG(score) as averageScore,
      SUM(time_taken) as totalTime,
      SUM(CASE WHEN score >= 70 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as passRate
    FROM test_results
    WHERE user_id = ?
  `, [userId]);

  // Get subject-wise performance
  const [subjectStats] = await db.query(`
    SELECT 
      s.name as subject,
      COUNT(*) as attempts,
      AVG(tr.score) as averageScore,
      MAX(tr.score) as highestScore
    FROM test_results tr
    JOIN subjects s ON tr.subject_id = s.id
    WHERE tr.user_id = ?
    GROUP BY s.id, s.name
  `, [userId]);

  res.json({
    success: true,
    stats: {
      totalTests: stats.totalTests || 0,
      averageScore: Math.round(stats.averageScore || 0),
      totalTime: stats.totalTime || 0,
      passRate: Math.round(stats.passRate || 0)
    },
    subjectStats
  });
});

// Get details of a specific test
const getTestById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get test details
  const [[test]] = await db.query(`
    SELECT 
      tr.id,
      tr.created_at as date,
      tr.score,
      tr.total_questions,
      tr.time_taken,
      s.name as subject,
      CONCAT('Test ', tr.id) as name
    FROM test_results tr
    LEFT JOIN subjects s ON tr.subject_id = s.id
    WHERE tr.id = ? AND tr.user_id = ?
  `, [id, userId]);

  if (!test) {
    throw new ApiError('Test not found', 404);
  }

  // Get test answers with questions
  const [answers] = await db.query(`
    SELECT 
      ta.question_id,
      ta.selected_answer,
      ta.is_correct,
      ta.points,
      q.question_text,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_answer,
      q.explanation
    FROM test_answers ta
    JOIN questions q ON ta.question_id = q.id
    WHERE ta.test_id = ?
  `, [id]);

  res.json({
    success: true,
    test: {
      ...test,
      date: test.date.toISOString(),
      score: Math.round(test.score),
      answers: answers.map(answer => ({
        questionId: answer.question_id,
        questionText: answer.question_text,
        selectedAnswer: answer.selected_answer,
        correctAnswer: answer.correct_answer,
        isCorrect: answer.is_correct,
        points: answer.points,
        options: {
          a: answer.option_a,
          b: answer.option_b,
          c: answer.option_c,
          d: answer.option_d
        },
        explanation: answer.explanation
      }))
    }
  });
});

module.exports = {
  getTestHistory,
  getTestStats,
  getTestById
}; 