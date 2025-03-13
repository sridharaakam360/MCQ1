const db = require('../config/db').pool;
const logger = require('../config/logger');
const { ApiError } = require('../utils/errors');
const { catchAsync } = require('../utils/errors');
const { validateUser, validateReport } = require('../utils/validation');
const cache = require('../config/cache');
const bcrypt = require('bcryptjs');
const { createObjectCsvStringifier } = require('csv-writer');
const { generatePDF } = require('../utils/pdfGenerator');
const XLSX = require('xlsx');
const path = require('path');

// Utility function for error handling
const handleError = (error, message, statusCode = 500) => {
  console.error(message, error);
  return { message, error: error.message, statusCode };
};

// Get Users with pagination and caching
const getUsers = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search;

  // Try cache first
  const cacheKey = `admin:users:${page}:${limit}:${search || ''}`;
  const cachedUsers = await cache.get(cacheKey);

  if (cachedUsers) {
    return res.json(JSON.parse(cachedUsers));
  }

  let query = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.first_name,
      u.last_name,
      u.is_admin,
      u.is_verified,
      u.is_active,
      u.created_at,
      u.last_login,
      COUNT(DISTINCT tr.id) as total_tests,
      ROUND(AVG(tr.score), 2) as avg_score
    FROM users u
    LEFT JOIN test_results tr ON tr.user_id = u.id
  `;

  const params = [];

  if (search) {
    query += ` WHERE (
      u.username LIKE ? OR 
      u.email LIKE ? OR 
      u.first_name LIKE ? OR 
      u.last_name LIKE ?
    )`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  query += ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  // Get total count
  const [countResult] = await db.query(
    'SELECT COUNT(*) as total FROM users' + (search ? ' WHERE username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?' : ''),
    search ? [search, search, search, search] : []
  );

  const [users] = await db.query(query, params);

  const result = {
    success: true,
    pagination: {
      page,
      limit,
      total: countResult[0].total,
      pages: Math.ceil(countResult[0].total / limit)
    },
    users: users.map(user => ({
      ...user,
      is_admin: Boolean(user.is_admin),
      is_verified: Boolean(user.is_verified),
      is_active: Boolean(user.is_active)
    }))
  };

  // Cache for 5 minutes
  await cache.set(cacheKey, JSON.stringify(result), 300);

  res.json(result);
});

// Get user by ID with caching
const getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Try cache first
  const cacheKey = `admin:user:${id}`;
  const cachedUser = await cache.get(cacheKey);

  if (cachedUser) {
    return res.json(JSON.parse(cachedUser));
  }

  const [users] = await db.query(`
    SELECT 
      u.*,
      COUNT(DISTINCT tr.id) as total_tests,
      ROUND(AVG(tr.score), 2) as avg_score,
      MAX(tr.score) as highest_score,
      SUM(tr.time_taken) as total_time,
      (
        SELECT COUNT(*)
        FROM test_results
        WHERE user_id = u.id
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) as recent_tests
    FROM users u
    LEFT JOIN test_results tr ON tr.user_id = u.id
    WHERE u.id = ?
    GROUP BY u.id
  `, [id]);

  if (!users[0]) {
    throw new ApiError('User not found', 404);
  }

  const user = users[0];
  delete user.password;

  const result = {
    success: true,
    user: {
      ...user,
      is_admin: Boolean(user.is_admin),
      is_verified: Boolean(user.is_verified),
      is_active: Boolean(user.is_active)
    }
  };

  // Cache for 5 minutes
  await cache.set(cacheKey, JSON.stringify(result), 300);

  res.json(result);
});

// Create user with validation
const createUser = catchAsync(async (req, res) => {
  const userData = req.body;

  // Validate user data
  const validation = validateUser(userData);
  if (!validation.isValid) {
    throw new ApiError(validation.message, 400);
  }

  // Check unique constraints
  const [existing] = await db.query(
    'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
    [userData.username, userData.email]
  );

  if (existing.length > 0) {
    const existingUser = existing[0];
    if (existingUser.email === userData.email) {
      throw new ApiError('Email already exists', 400);
    }
    if (existingUser.username === userData.username) {
      throw new ApiError('Username already exists', 400);
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  // Create user
  const [result] = await db.query(`
    INSERT INTO users (
      username,
      email,
      password,
      first_name,
      last_name,
      is_admin,
      is_verified,
      created_by,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    userData.username.toLowerCase(),
    userData.email.toLowerCase(),
    hashedPassword,
    userData.firstName,
    userData.lastName,
    Boolean(userData.isAdmin),
    Boolean(userData.isVerified),
    req.user.id
  ]);

  // Clear users cache
  await cache.del('admin:users:*');

  logger.info('User created successfully', {
    userId: result.insertId,
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    userId: result.insertId
  });
});

// Get analytics data with caching
const getAnalytics = catchAsync(async (req, res) => {
  const { range = '30d', type = 'all' } = req.query;

  // Try cache first
  const cacheKey = `admin:analytics:${range}:${type}`;
  const cachedData = await cache.get(cacheKey);

  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  const rangeMap = {
    '7d': 'INTERVAL 7 DAY',
    '30d': 'INTERVAL 30 DAY',
    '90d': 'INTERVAL 90 DAY',
    '1y': 'INTERVAL 1 YEAR'
  };

  const timeRange = rangeMap[range] || 'INTERVAL 30 DAY';
  const queries = [];

  if (type === 'all' || type === 'users') {
    queries.push(db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users,
        COUNT(DISTINCT CASE WHEN last_login >= DATE_SUB(NOW(), ${timeRange}) THEN id END) as active_users
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), ${timeRange})
      GROUP BY DATE(created_at)
      ORDER BY date
    `));
  }

  if (type === 'all' || type === 'tests') {
    queries.push(db.query(`
      SELECT 
        COUNT(*) as total_tests,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(AVG(score), 2) as avg_score
      FROM test_results
      WHERE created_at >= DATE_SUB(NOW(), ${timeRange})
    `));
  }

  if (type === 'all' || type === 'subjects') {
    queries.push(db.query(`
      SELECT 
        s.name as subject_name,
        COUNT(tr.id) as total_tests,
        ROUND(AVG(tr.score), 2) as avg_score,
        COUNT(DISTINCT tr.user_id) as unique_users
      FROM subjects s
      LEFT JOIN test_results tr ON tr.subject_id = s.id
      WHERE tr.created_at >= DATE_SUB(NOW(), ${timeRange})
      GROUP BY s.id
      ORDER BY total_tests DESC
    `));
  }

// Add test completion stats query
if (type === 'all' || type === 'completion') {
  queries.push(db.query(`
    SELECT 
      COUNT(*) as completed_tests,
      COUNT(DISTINCT user_id) as users_completed
    FROM test_results
    WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), ${timeRange})
  `));
}

// Assuming the first query is for users, second for tests, and third for completion
if (type === 'all' || type === 'users') {
  analytics.users = results[0][0];
}

if (type === 'all' || type === 'tests') {
  analytics.tests = results[1][0];
}

if (type === 'all' || type === 'completion') {
  analytics.testCompletionStats = results[2][0];
}
if (type === 'all' || type === 'subjects') {
  analytics.subjects = results[type === 'all' ? 2 : 0][0];
}

return res.json({ success: true, data: analytics });
  const result = {
    success: true,
    range,
    analytics
  };

  // Cache for 5 minutes
  await cache.set(cacheKey, JSON.stringify(result), 300);

  res.json(result);
});

// Export report
const exportReport = catchAsync(async (req, res) => {
  const { type = 'users', range = '30d', format = 'csv' } = req.query;

  // Validate report parameters
  const validation = validateReport({ type, range, format });
  if (!validation.isValid) {
    throw new ApiError(validation.message, 400);
  }

  // Get analytics data
  const { analytics } = await getAnalytics(req, res);

  if (format === 'csv') {
    const csvStringifier = createObjectCsvStringifier({
      header: getReportHeaders(type)
    });

    const records = formatReportData(type, analytics[type]);
    const csvString = csvStringifier.stringifyRecords(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${range}.csv`);
    return res.send(csvString);
  }

  if (format === 'pdf') {
    const pdfBuffer = await generatePDF(type, analytics[type]);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${range}.pdf`);
    return res.send(pdfBuffer);
  }

  throw new ApiError('Unsupported format', 400);
});

// Helper functions for report generation
const getReportHeaders = (type) => {
  const headers = {
    users: [
      { id: 'date', title: 'Date' },
      { id: 'newUsers', title: 'New Users' },
      { id: 'activeUsers', title: 'Active Users' }
    ],
    tests: [
      { id: 'date', title: 'Date' },
      { id: 'totalTests', title: 'Total Tests' },
      { id: 'avgScore', title: 'Average Score' },
      { id: 'uniqueUsers', title: 'Unique Users' }
    ],
    subjects: [
      { id: 'subject', title: 'Subject' },
      { id: 'totalTests', title: 'Total Tests' },
      { id: 'avgScore', title: 'Average Score' },
      { id: 'uniqueUsers', title: 'Unique Users' }
    ]
  };

  return headers[type] || headers.users;
};

const formatReportData = (type, data) => {
  if (!data) return [];

  switch (type) {
    case 'users':
      return data.map(d => ({
        date: d.date,
        newUsers: d.new_users,
        activeUsers: d.active_users
      }));
    case 'tests':
      return data.map(d => ({
        date: d.date,
        totalTests: d.total_tests,
        avgScore: d.avg_score,
        uniqueUsers: d.unique_users
      }));
    case 'subjects':
      return data.map(d => ({
        subject: d.subject_name,
        totalTests: d.total_tests,
        avgScore: d.avg_score,
        uniqueUsers: d.unique_users
      }));
    default:
      return [];
  }
};

// Get dashboard overview
const getDashboardOverview = catchAsync(async (req, res) => {
  const [userStats] = await db.query(`
    SELECT 
      COUNT(*) as totalUsers,
      COUNT(DISTINCT CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN id END) as activeUsers
    FROM users
  `);

  const [testStats] = await db.query(`
    SELECT 
      COUNT(*) as totalTests,
      ROUND(AVG(score), 2) as averageScore
    FROM test_results
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `);

  const [recentUsers] = await db.query(`
    SELECT 
      id,
      username,
      email,
      first_name,
      last_name,
      created_at,
      last_login
    FROM users
    ORDER BY created_at DESC
    LIMIT 5
  `);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers: userStats[0].totalUsers,
        activeUsers: userStats[0].activeUsers,
        totalTests: testStats[0].totalTests,
        averageScore: testStats[0].averageScore
      },
      recentUsers
    }
  });
});

// Get performance analytics
const getPerformanceAnalytics = catchAsync(async (req, res) => {
  const { range = '30d' } = req.query;
  const rangeMap = {
    '7d': 'INTERVAL 7 DAY',
    '30d': 'INTERVAL 30 DAY',
    '90d': 'INTERVAL 90 DAY',
    '1y': 'INTERVAL 1 YEAR'
  };
  const timeRange = rangeMap[range] || 'INTERVAL 30 DAY';

  const [performanceData] = await db.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as totalTests,
      ROUND(AVG(score), 2) as averageScore,
      COUNT(DISTINCT user_id) as uniqueUsers
    FROM test_results
    WHERE created_at >= DATE_SUB(NOW(), ${timeRange})
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  res.json({
    success: true,
    data: performanceData
  });
});

// Get test statistics
const getTestStats = catchAsync(async (req, res) => {
  const [testStats] = await db.query(`
    SELECT 
      COUNT(*) as totalTests,
      ROUND(AVG(score), 2) as averageScore,
      COUNT(DISTINCT user_id) as uniqueUsers,
      COUNT(DISTINCT subject_id) as uniqueSubjects
    FROM test_results
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `);

  res.json({
    success: true,
    data: testStats[0]
  });
});

// Get user statistics
const getUserStats = catchAsync(async (req, res) => {
  const [userStats] = await db.query(`
    SELECT 
      COUNT(*) as totalUsers,
      COUNT(DISTINCT CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN id END) as activeUsers,
      COUNT(DISTINCT CASE WHEN is_admin = 1 THEN id END) as adminUsers,
      COUNT(DISTINCT CASE WHEN is_verified = 1 THEN id END) as verifiedUsers
    FROM users
  `);

  res.json({
    success: true,
    data: userStats[0]
  });
});

// Get performance statistics
const getPerformanceStats = catchAsync(async (req, res) => {
  const [performanceStats] = await db.query(`
    SELECT 
      s.name as subject,
      COUNT(tr.id) as totalTests,
      ROUND(AVG(tr.score), 2) as averageScore,
      COUNT(DISTINCT tr.user_id) as uniqueUsers
    FROM subjects s
    LEFT JOIN test_results tr ON tr.subject_id = s.id
    WHERE tr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY s.id, s.name
    ORDER BY totalTests DESC
  `);

  res.json({
    success: true,
    data: performanceStats
  });
});

// Get subject management data with caching
const getSubjects = catchAsync(async (req, res) => {
  const { active = true } = req.query;
  
  const cacheKey = `admin:subjects:${active}`;
  const cachedData = await cache.get(cacheKey);

  if (cachedData) {
    return res.json(JSON.parse(cachedData));
  }

  const [subjects] = await db.query(`
    SELECT
      s.*,
      COUNT(DISTINCT q.id) as question_count,
      COUNT(DISTINCT tr.id) as test_count,
      COUNT(DISTINCT tr.user_id) as unique_users,
      ROUND(AVG(tr.score), 2) as avg_score
    FROM subjects s
    LEFT JOIN questions q ON q.subject_id = s.id AND q.is_active = true
    LEFT JOIN test_results tr ON tr.subject_id = s.id
    WHERE s.is_active = ?
    GROUP BY s.id
    ORDER BY s.name
  `, [active]);

  // Get topic distribution for each subject
  const subjectsWithTopics = await Promise.all(
    subjects.map(async subject => {
      const [topics] = await db.query(`
        SELECT
          topic,
          COUNT(*) as question_count
        FROM questions
        WHERE subject_id = ? AND is_active = true
        GROUP BY topic
        ORDER BY question_count DESC
      `, [subject.id]);

      return {
        ...subject,
        topics: topics.map(t => ({
          name: t.topic,
          questionCount: t.question_count
        }))
      };
    })
  );

  const result = {
    success: true,
    subjects: subjectsWithTopics.map(subject => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      isActive: Boolean(subject.is_active),
      createdAt: subject.created_at,
      stats: {
        questionCount: subject.question_count,
        testCount: subject.test_count,
        uniqueUsers: subject.unique_users,
        avgScore: subject.avg_score
      },
      topics: subject.topics
    }))
  };

  // Cache for 5 minutes
  await cache.set(cacheKey, JSON.stringify(result), 300);

  res.json(result);
});

// Create or update subject
const manageSubject = catchAsync(async (req, res) => {
  const { id } = req.params;
  const subjectData = req.body;

  // Validate subject data
  const validation = validateSubject(subjectData);
  if (!validation.isValid) {
    throw new ApiError(validation.message, 400);
  }

  let result;
  if (id) {
    // Update existing subject
    [result] = await db.query(`
      UPDATE subjects
      SET
        name = ?,
        code = ?,
        description = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = ?
      WHERE id = ?
    `, [
      subjectData.name,
      subjectData.code,
      subjectData.description,
      Boolean(subjectData.isActive),
      req.user.id,
      id
    ]);

    if (result.affectedRows === 0) {
      throw new ApiError('Subject not found', 404);
    }
  } else {
    // Create new subject
    [result] = await db.query(`
      INSERT INTO subjects (
        name,
        code,
        description,
        is_active,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      subjectData.name,
      subjectData.code,
      subjectData.description,
      Boolean(subjectData.isActive),
      req.user.id
    ]);
  }

  // Clear subjects cache
  await cache.del('admin:subjects:*');

  logger.info(`Subject ${id ? 'updated' : 'created'} successfully`, {
    subjectId: id || result.insertId,
    updatedBy: req.user.id
  });

  res.status(id ? 200 : 201).json({
    success: true,
    message: `Subject ${id ? 'updated' : 'created'} successfully`,
    subjectId: id || result.insertId
  });
});

// Get dashboard statistics
const getDashboardStats = catchAsync(async (req, res) => {
  try {
    // Get total users
    const [userStats] = await db.query(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN is_active = true THEN 1 END) as activeUsers
      FROM users
    `);

    // Get test statistics
    const [testStats] = await db.query(`
      SELECT 
        COUNT(*) as totalTests,
        ROUND(AVG(score), 2) as averageScore
      FROM test_results
    `);

    // Get recent users
    const [recentUsers] = await db.query(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Get test statistics by subject
    const [subjectStats] = await db.query(`
      SELECT 
        s.name as subject,
        COUNT(tr.id) as totalTests,
        ROUND(AVG(tr.score), 2) as averageScore
      FROM subjects s
      LEFT JOIN questions q ON q.subject_id = s.id
      LEFT JOIN test_answers ta ON ta.question_id = q.id
      LEFT JOIN test_results tr ON tr.id = ta.test_result_id
      GROUP BY s.id, s.name
    `);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers: userStats[0].totalUsers,
          activeUsers: userStats[0].activeUsers,
          totalTests: testStats[0].totalTests,
          averageScore: testStats[0].averageScore
        },
        recentUsers,
        subjectStats
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw new ApiError('Failed to fetch dashboard statistics', 500);
  }
});

// Update user active status
const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new ApiError('isActive must be a boolean value', 400);
  }

  // Prevent deactivating self
  if (req.user.id === parseInt(id) && !isActive) {
    throw new ApiError('Cannot deactivate your own account', 400);
  }

  const [result] = await db.query(
    `UPDATE users 
     SET is_active = ?,
         updated_at = CURRENT_TIMESTAMP,
         updated_by = ?
     WHERE id = ?`,
    [isActive, req.user.id, id]
  );

  if (result.affectedRows === 0) {
    throw new ApiError('User not found', 404);
  }

  // Clear user cache
  await cache.del(`admin:user:${id}`);
  await cache.del('admin:users:*');

  logger.info('User status updated successfully', {
    userId: id,
    isActive,
    updatedBy: req.user.id
  });

  res.json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
  });
});

// Upload questions from Excel
const uploadQuestions = catchAsync(async (req, res) => {
  try {
    if (!req.file) {
      throw new ApiError('No file uploaded', 400);
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const questions = XLSX.utils.sheet_to_json(worksheet);

    if (questions.length === 0) {
      throw new ApiError('No questions found in the file', 400);
    }

    // Validate questions
    const errors = [];
    const validQuestions = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const rowNumber = i + 2; // Excel row number (1-indexed + header row)

      // Validate required fields
      if (!question.question) {
        errors.push(`Row ${rowNumber}: Missing question`);
        continue;
      }

      if (!question.subject) {
        errors.push(`Row ${rowNumber}: Missing subject`);
        continue;
      }

      if (!question.year) {
        errors.push(`Row ${rowNumber}: Missing year`);
        continue;
      }

      if (!question.answer) {
        errors.push(`Row ${rowNumber}: Missing answer`);
        continue;
      }

      if (!question.option1 || !question.option2 || !question.option3 || !question.option4) {
        errors.push(`Row ${rowNumber}: Missing one or more options`);
        continue;
      }

      // Validate answer format
      const answer = question.answer.toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(answer)) {
        errors.push(`Row ${rowNumber}: Invalid answer format. Must be A, B, C, or D`);
        continue;
      }

      // Get subject ID
      const [subjects] = await db.query(
        'SELECT id FROM subjects WHERE name = ?',
        [question.subject]
      );

      if (subjects.length === 0) {
        errors.push(`Row ${rowNumber}: Invalid subject "${question.subject}"`);
        continue;
      }

      validQuestions.push({
        question: question.question,
        option_a: question.option1,
        option_b: question.option2,
        option_c: question.option3,
        option_d: question.option4,
        correct_answer: answer,
        subject_id: subjects[0].id,
        year: parseInt(question.year),
        degree: question.degree || 'B.Pharm'
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors found',
        errors
      });
    }

    // Insert questions in batches
    const batchSize = 100;
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < validQuestions.length; i += batchSize) {
      const batch = validQuestions.slice(i, i + batchSize);
      
      try {
        await db.query(`
          INSERT INTO questions (
            question, option_a, option_b, option_c, option_d,
            correct_answer, subject_id, year, degree
          ) VALUES ?
        `, [batch.map(q => [
          q.question, q.option_a, q.option_b, q.option_c, q.option_d,
          q.correct_answer, q.subject_id, q.year, q.degree
        ])]);
        
        results.success += batch.length;
      } catch (error) {
        results.failed += batch.length;
        results.errors.push(`Failed to insert batch ${i / batchSize + 1}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${results.success} questions${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
      results
    });

  } catch (error) {
    console.error('Error uploading questions:', error);
    throw new ApiError(error.message || 'Failed to upload questions', 500);
  }
});

// Update user
const updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userData = req.body;

  // Validate user data
  const validation = validateUser(userData);
  if (!validation.isValid) {
    throw new ApiError(validation.errors.join(', '), 400);
  }

  // Check unique constraints
  const [existing] = await db.query(
    'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
    [userData.username, userData.email]
  );

  if (existing.length > 0) {
    const existingUser = existing[0];
    if (existingUser.email === userData.email) {
      throw new ApiError('Email already exists', 400);
    }
    if (existingUser.username === userData.username) {
      throw new ApiError('Username already exists', 400);
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  // Update user
  const [result] = await db.query(`
    UPDATE users
    SET
      username = ?,
      email = ?,
      password = ?,
      first_name = ?,
      last_name = ?,
      is_admin = ?,
      is_verified = ?,
      updated_at = CURRENT_TIMESTAMP,
      updated_by = ?
    WHERE id = ?
  `, [
    userData.username.toLowerCase(),
    userData.email.toLowerCase(),
    hashedPassword,
    userData.firstName,
    userData.lastName,
    Boolean(userData.isAdmin),
    Boolean(userData.isVerified),
    req.user.id,
    id
  ]);

  if (result.affectedRows === 0) {
    throw new ApiError('User not found', 404);
  }

  // Clear user cache
  await cache.del(`admin:user:${id}`);
  await cache.del('admin:users:*');

  logger.info('User updated successfully', {
    userId: id,
    updatedBy: req.user.id
  });

  res.json({
    success: true,
    message: 'User updated successfully'
  });
});

// Delete user
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Prevent deleting self
  if (req.user.id === parseInt(id)) {
    throw new ApiError('Cannot delete your own account', 400);
  }

  const [result] = await db.query(
    'DELETE FROM users WHERE id = ?',
    [id]
  );

  if (result.affectedRows === 0) {
    throw new ApiError('User not found', 404);
  }

  // Clear user cache
  await cache.del(`admin:user:${id}`);
  await cache.del('admin:users:*');

  logger.info('User deleted successfully', {
    userId: id,
    deletedBy: req.user.id
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Get question template
const getQuestionTemplate = catchAsync(async (req, res) => {
  const templatePath = path.join(__dirname, '../templates/question_template.xlsx');
  res.download(templatePath, 'question_template.xlsx');
});

module.exports = {
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
  getDashboardStats,
  updateUserStatus,
  uploadQuestions,
  updateUser,
  deleteUser,
  getQuestionTemplate
};