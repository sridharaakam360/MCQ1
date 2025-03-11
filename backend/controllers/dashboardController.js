const db = require('../config/db').pool;
const { ApiError } = require('../utils/errors');

// Get user performance data
const getPerformance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get overall performance stats
    const [stats] = await db.query(
      `SELECT 
        COUNT(id) as total_tests,
        ROUND(AVG(score), 2) as average_score,
        SUM(time_taken) as total_time,
        MAX(score) as highest_score,
        MIN(score) as lowest_score
      FROM test_results
      WHERE user_id = ?`,
      [userId]
    );

    // Get performance by subject
    const [subjectStats] = await db.query(
      `SELECT 
        s.name as subject_name,
        COUNT(tr.id) as test_count,
        ROUND(AVG(tr.score), 2) as average_score,
        MAX(tr.score) as highest_score
      FROM test_results tr
      JOIN subjects s ON tr.subject_id = s.id
      WHERE tr.user_id = ?
      GROUP BY s.id, s.name
      ORDER BY average_score DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          total_tests: 0,
          average_score: 0,
          total_time: 0,
          highest_score: 0,
          lowest_score: 0
        },
        bySubject: subjectStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get recent tests
const getRecentTests = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [recentTests] = await db.query(
      `SELECT 
        tr.id,
        tr.score,
        tr.time_taken,
        tr.created_at,
        s.name as subject_name,
        tr.total_questions,
        tr.correct_answers
      FROM test_results tr
      JOIN subjects s ON tr.subject_id = s.id
      WHERE tr.user_id = ?
      ORDER BY tr.created_at DESC
      LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      data: recentTests
    });
  } catch (error) {
    next(error);
  }
};

// Get subject performance
const getSubjectPerformance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [subjectPerformance] = await db.query(
      `SELECT 
        s.id,
        s.name,
        COUNT(tr.id) as total_tests,
        ROUND(AVG(tr.score), 2) as average_score,
        MAX(tr.score) as highest_score,
        MIN(tr.score) as lowest_score,
        ROUND(AVG(tr.time_taken), 2) as average_time
      FROM subjects s
      LEFT JOIN test_results tr ON s.id = tr.subject_id AND tr.user_id = ?
      GROUP BY s.id, s.name
      ORDER BY average_score DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: subjectPerformance
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPerformance,
  getRecentTests,
  getSubjectPerformance
}; 