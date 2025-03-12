const db = require('../config/db').pool;

const logger = require('../config/logger');
const { ApiError } = require('../utils/errors');
const { catchAsync } = require('../utils/errors');
const { validateTest } = require('../utils/validation');
const cache = require('../config/cache');
const { safeToUpperCase } = require('../utils/stringUtils');

// Error handler helper
const handleError = (res, error, message, statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ message, error: error.message });
};

// Helper function to normalize answer
const normalizeAnswer = (answer) => {
  if (!answer) return null;
  return String(answer).trim().toLowerCase();
};

// Get test questions with caching
const getTestQuestions = catchAsync(async (req, res) => {
  const { count = 10, subject_id, degree } = req.query;
  const userId = req.user.id;

  // First check if there are any questions for this degree
  if (degree) {
    const [degreeCheck] = await db.query(
      'SELECT COUNT(*) as count FROM questions WHERE degree = ?',
      [degree]
    );
    console.log('Total questions for degree:', degree, ':', degreeCheck[0].count);
    
    if (degreeCheck[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for exam type: ${degree}`
      });
    }
  }

  // If subject is specified, check if it has questions
  if (subject_id) {
    const [subjectCheck] = await db.query(
      'SELECT COUNT(*) as count FROM questions WHERE subject_id = ?',
      [subject_id]
    );
    console.log('Total questions for subject:', subject_id, ':', subjectCheck[0].count);
    
    if (subjectCheck[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for selected subject`
      });
    }
  }

  let query = `
    SELECT 
      q.id,
      q.question,
      q.option1,
      q.option2,
      q.option3,
      q.option4,
      q.answer as correct_answer,
      q.degree,
      s.name as subject_name,
      s.id as subject_id
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    WHERE s.is_active = 1
  `;

  const params = [];

  if (subject_id) {
    query += ' AND q.subject_id = ?';
    params.push(subject_id);
  }

  if (degree) {
    query += ' AND q.degree = ?';
    params.push(degree);
  }

  query += ' ORDER BY RAND() LIMIT ?';
  params.push(parseInt(count));

  console.log('Executing query:', query);
  console.log('With params:', params);

  const [questions] = await db.query(query, params);
  console.log('Query result:', questions);

  if (!questions.length) {
    // Get more specific about why no questions were found
    const message = subject_id && degree 
      ? `No questions found for the selected subject in ${degree} exam type`
      : 'No questions found for the selected criteria';
    
    return res.status(404).json({
      success: false,
      message: message
    });
  }

  res.json({
    success: true,
    data: questions.map(question => ({
      id: question.id,
      question: question.question,
      options: {
        A: question.option1,
        B: question.option2,
        C: question.option3,
        D: question.option4
      },
      correctAnswer: question.correct_answer,
      difficulty: question.degree,
      subject: {
        id: question.subject_id,
        name: question.subject_name
      }
    }))
  });
});

// Get test filters with caching
const getTestFilters = catchAsync(async (req, res) => {
  const cacheKey = 'test:filters';
  const cachedFilters = await cache.get(cacheKey);

  if (cachedFilters) {
    return res.json(JSON.parse(cachedFilters));
  }

  // Get active subjects
  const [subjects] = await db.query(
    'SELECT id, name FROM subjects WHERE is_active = 1 ORDER BY name'
  );

  // Get degrees (exam types) with counts
  const [degrees] = await db.query(`
    SELECT 
      degree,
      COUNT(*) as question_count
    FROM questions
    WHERE degree IN ('Bpharm', 'Dpharm', 'Both')
    GROUP BY degree
    ORDER BY degree
  `);

  // Log the results for debugging
  console.log('Subjects found:', subjects.length);
  console.log('Degrees found:', degrees.length);

  const result = {
    success: true,
    data: {
      subjects: subjects.map(s => ({
        id: s.id,
        name: s.name
      })),
      exams: degrees.map(d => ({
        name: d.degree,
        count: d.question_count
      }))
    }
  };


  // Cache for 1 hour
  await cache.set(cacheKey, JSON.stringify(result), 3600);

  res.json(result);
});

// Submit test with transaction and validation
const submitTest = catchAsync(async (req, res) => {
  const { answers, testData } = req.body;
  const userId = req.user.id;
  
  // Validate test submission
  const validation = validateTest({ answers, testData });
  if (!validation.isValid) {
    throw new ApiError(validation.errors.join(', '), 400);
  }

  // Start transaction
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Create test result
    const [result] = await connection.query(
      `INSERT INTO test_results (
        user_id, 
        degree,
        total_questions, 
        score, 
        correct_answers,
        incorrect_answers,
        time_taken,
        started_at,
        completed_at,
        status
      ) VALUES (?, ?, ?, 0, 0, 0, ?, NOW(), NOW(), 'completed')`,
      [userId, testData.degree, testData.totalQuestions, testData.timeTaken]
    );

    const testId = result.insertId;
    let totalScore = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;

    // Process each answer
    for (const [questionId, answer] of Object.entries(answers)) {
      // Get question details
      const [question] = await connection.query(
        'SELECT answer FROM questions WHERE id = ?',
        [questionId]
      );

      if (!question[0]) {
        throw new ApiError(`Question ${questionId} not found`, 404);
      }

      const isCorrect = answer === question[0].answer;
      // Each question is worth 1 point
      const points = isCorrect ? 1 : 0;
      totalScore += points;
      
      if (isCorrect) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }

      // Record answer
      await connection.query(
        `INSERT INTO test_answers (test_result_id, question_id, selected_answer, is_correct, time_taken)
         VALUES (?, ?, ?, ?, ?)`,
        [testId, questionId, answer, isCorrect, 0]
      );
    }

    // Calculate actual number of questions answered
    const answeredQuestions = Object.keys(answers).length;
    console.log('Questions answered:', answeredQuestions, 'Correct answers:', correctAnswers);

    // Calculate percentage score based on answered questions
    const percentageScore = (correctAnswers / answeredQuestions) * 100;
    console.log('Percentage score:', percentageScore);

    // Update test result with final score and counts
    await connection.query(
      `UPDATE test_results 
       SET score = ?, 
           correct_answers = ?,
           incorrect_answers = ?,
           total_questions = ?
       WHERE id = ?`,
      [percentageScore, correctAnswers, incorrectAnswers, answeredQuestions, testId]
    );

    await connection.commit();

    res.json({
      success: true,
      data: {
        resultId: testId,
        score: percentageScore,
        totalQuestions: answeredQuestions,
        timeTaken: testData.timeTaken,
        correctAnswers,
        incorrectAnswers
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// Get user's test history with pagination and caching
const getTestHistory = catchAsync(async (req, res) => {
  const userId = req.params.userId || req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  console.log('Fetching test history for user:', userId);
  console.log('Page:', page, 'Limit:', limit, 'Offset:', offset);

  // Clear cache for debugging
  const cacheKey = `user:${userId}:tests:${page}:${limit}`;
  await cache.clear();
  
  // Get total count
  const [countResult] = await db.query(
    'SELECT COUNT(*) as total FROM test_results WHERE user_id = ?',
    [userId]
  );
  
  const total = countResult[0].total;
  console.log('Total test results found:', total);

  // Get paginated test history with details
  const [tests] = await db.query(`
    SELECT 
      tr.id,
      tr.total_questions,
      tr.score,
      tr.time_taken,
      tr.created_at,
      tr.degree,
      (
        SELECT COUNT(*)
        FROM test_answers ta
        WHERE ta.test_result_id = tr.id AND ta.is_correct = true
      ) as correct_answers
    FROM test_results tr
    WHERE tr.user_id = ?
    ORDER BY tr.created_at DESC
    LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  console.log('Tests found:', tests.length);
  console.log('Test results:', JSON.stringify(tests, null, 2));

  const result = {
    success: true,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    tests: tests.map(test => ({
      id: test.id,
      totalQuestions: test.total_questions,
      score: test.score,
      correctAnswers: test.correct_answers,
      timeTaken: test.time_taken,
      completedAt: test.created_at,
      subject: {
        name: test.degree
      }
    }))
  };

  // Only cache if we have results
  if (tests.length > 0) {
    await cache.set(cacheKey, JSON.stringify(result), 300);
  }

  res.json(result);
});

// Get specific test details with caching
const getTestById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Try cache first
  const cacheKey = `test:${id}:${userId}`;
  const cachedTest = await cache.get(cacheKey);

  if (cachedTest) {
    return res.json(JSON.parse(cachedTest));
  }

  // Get test details with answers
  const [tests] = await db.query(`
    SELECT 
      tr.*,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'questionId', ta.question_id,
          'question', q.question,
          'selectedAnswer', ta.selected_answer,
          'correctAnswer', q.answer,
          'isCorrect', ta.is_correct,
          'points', CASE WHEN ta.is_correct THEN 1 ELSE 0 END as points,
          'options', JSON_ARRAY(
            q.option1,
            q.option2,
            q.option3,
            q.option4
          )
        )
      ) as answers
    FROM test_results tr
    LEFT JOIN test_answers ta ON tr.id = ta.test_result_id
    LEFT JOIN questions q ON ta.question_id = q.id
    WHERE tr.id = ? AND tr.user_id = ?
    GROUP BY tr.id`,
    [id, userId]
  );

  if (!tests[0]) {
    throw new ApiError('Test not found', 404);
  }

  const test = tests[0];
  test.answers = JSON.parse(test.answers);

  const result = {
    success: true,
    test: {
      id: test.id,
      totalQuestions: test.total_questions,
      score: test.score,
      timeTaken: test.time_taken,
      completedAt: test.created_at,
      subject: {
        name: test.degree
      },
      answers: test.answers
    }
  };

  // Cache for 1 hour
  await cache.set(cacheKey, JSON.stringify(result), 3600);

  res.json(result);
});

// Get test statistics with caching
const getTestStats = catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  // Try cache first
  const cacheKey = `user:${userId}:stats`;
  const cachedStats = await cache.get(cacheKey);

  if (cachedStats) {
    return res.json(JSON.parse(cachedStats));
  }

  // Get overall statistics
  const [overallStats] = await db.query(`
    SELECT 
      COUNT(*) as total_tests,
      SUM(score) as total_score,
      ROUND(AVG(score), 2) as avg_score,
      MAX(score) as highest_score,
      SUM(time_taken) as total_time,
      COUNT(DISTINCT degree) as subjects_covered
    FROM test_results
    WHERE user_id = ?
  `, [userId]);

  // Get subject-wise performance
  const [subjectStats] = await db.query(`
    SELECT 
      degree as subject_name,
      COUNT(*) as tests_taken,
      ROUND(AVG(score), 2) as avg_score,
      MAX(score) as highest_score
    FROM test_results
    WHERE user_id = ?
    GROUP BY degree
    ORDER BY avg_score DESC
  `, [userId]);

  // Get recent improvement trend
  const [recentTrend] = await db.query(`
    SELECT 
      DATE(created_at) as test_date,
      COUNT(*) as tests_taken,
      ROUND(AVG(score), 2) as avg_score
    FROM test_results
    WHERE user_id = ? 
    AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DATE(created_at)
    ORDER BY test_date
  `, [userId]);

  const result = {
    success: true,
    stats: {
      overall: {
        totalTests: overallStats[0].total_tests,
        totalScore: overallStats[0].total_score,
        averageScore: overallStats[0].avg_score,
        highestScore: overallStats[0].highest_score,
        totalTime: overallStats[0].total_time,
        subjectsCovered: overallStats[0].subjects_covered
      },
      bySubject: subjectStats.map(stat => ({
        subject: {
          name: stat.subject_name
        },
        testsTaken: stat.tests_taken,
        averageScore: stat.avg_score,
        highestScore: stat.highest_score
      })),
      recentTrend: recentTrend.map(trend => ({
        date: trend.test_date,
        testsTaken: trend.tests_taken,
        averageScore: trend.avg_score
      }))
    }
  };

  // Cache for 1 hour
  await cache.set(cacheKey, JSON.stringify(result), 3600);

  res.json(result);
});

/**
 * @desc    Get test results by test ID
 * @route   GET /tests/results/:testId
 * @access  Private
 */
const getTestResults = catchAsync(async (req, res) => {
    const { testId } = req.params;
    const userId = req.user.id;

    console.log('Fetching test results for testId:', testId, 'userId:', userId);

    const [testResult] = await db.query(`
        SELECT 
            tr.id,
            tr.score,
            tr.total_questions,
            tr.correct_answers,
            tr.incorrect_answers,
            tr.time_taken,
            tr.created_at,
            tr.degree,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'questionId', q.id,
                    'question', q.question,
                    'options', JSON_ARRAY(
                        q.option1,
                        q.option2,
                        q.option3,
                        q.option4
                    ),
                    'correctOption', q.answer,
                    'selectedOption', ta.selected_answer,
                    'isCorrect', ta.is_correct
                )
            ) as questions
        FROM test_results tr
        LEFT JOIN test_answers ta ON tr.id = ta.test_result_id
        LEFT JOIN questions q ON ta.question_id = q.id
        WHERE tr.id = ? AND tr.user_id = ?
        GROUP BY tr.id, tr.score, tr.total_questions, tr.correct_answers, tr.incorrect_answers, tr.time_taken, tr.created_at, tr.degree
    `, [testId, userId]);

    console.log('Test result query response:', testResult);

    if (!testResult || testResult.length === 0) {
        console.log('No test result found for testId:', testId, 'userId:', userId);
        return res.status(404).json({
            success: false,
            message: 'Test result not found'
        });
    }

    const result = testResult[0];
    console.log('Raw result:', result);
    
    // The questions are already parsed by MySQL's JSON_ARRAYAGG
    const questions = result.questions || [];

    const response = {
        success: true,
        data: {
            testId: result.id,
            subject: {
                name: result.degree
            },
            totalQuestions: result.total_questions,
            correctAnswers: result.correct_answers,
            incorrectAnswers: result.incorrect_answers,
            score: parseFloat(result.score).toFixed(2),
            timeTaken: result.time_taken,
            questions: questions,
            submittedAt: result.created_at
        }
    };

    console.log('Sending response:', response);
    res.json(response);
});

// Export all functions
module.exports = {
  getTestQuestions,
  getTestFilters,
  submitTest,
  getTestHistory,
  getTestById,
  getTestStats,
  getTestResults,
};