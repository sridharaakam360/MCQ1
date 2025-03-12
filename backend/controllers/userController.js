const db = require('../config/db').pool;
const logger = require('../config/logger');
const { validateUsername, validateEmail, validatePhone, sanitizeUser } = require('../utils/validation');
const { ApiError } = require('../utils/errors');
const { catchAsync } = require('../utils/errors');
const User = require('../models/User');
const UserPerformance = require('../models/UserPerformance');
const asyncHandler = require('../utils/asyncHandler');

const handleError = (res, error, message, statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ message, error: error.message });
};

// Get all users (admin only)
const getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find().select('-password');
  res.json({ success: true, data: users });
});

// Get user by ID (admin or self)
const getUserById = catchAsync(async (req, res) => {
  const userId = req.params.id;
  
  // Check authorization
  if (!req.user.isAdmin && req.user.id !== parseInt(userId)) {
    throw new ApiError('Not authorized to access this user', 403);
  }

  const [users] = await db.query(`
    SELECT 
      u.*,
      COUNT(DISTINCT tr.id) as total_tests,
      ROUND(AVG(tr.score), 2) as avg_score,
      MAX(tr.score) as highest_score
    FROM users u
    LEFT JOIN test_results tr ON tr.user_id = u.id
    WHERE u.id = ? AND u.is_active = true
    GROUP BY u.id
  `, [userId]);

  if (!users[0]) {
    throw new ApiError('User not found', 404);
  }

  res.json({
    success: true,
    user: sanitizeUser(users[0])
  });
});

// Update user (admin or self)
const updateUser = catchAsync(async (req, res) => {
  const userId = req.params.id;
  const { username, email, firstName, lastName, phoneNumber, bio } = req.body;

  // Check authorization
  if (!req.user.isAdmin && req.user.id !== parseInt(userId)) {
    throw new ApiError('Not authorized to update this user', 403);
  }

  // Validate inputs
  if (username) {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      throw new ApiError(usernameValidation.message, 400);
    }

    // Check username uniqueness
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username.toLowerCase(), userId]
    );
    if (existingUsers.length > 0) {
      throw new ApiError('Username is already taken', 400);
    }
  }

  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      throw new ApiError(emailValidation.message, 400);
    }

    // Check email uniqueness
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email.toLowerCase(), userId]
    );
    if (existingUsers.length > 0) {
      throw new ApiError('Email is already registered', 400);
    }
  }

  if (phoneNumber) {
    const phoneValidation = validatePhone(phoneNumber);
    if (!phoneValidation.isValid) {
      throw new ApiError(phoneValidation.message, 400);
    }
  }

  // Update user
  await db.query(`
    UPDATE users 
    SET 
      username = COALESCE(?, username),
      email = COALESCE(?, email),
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      phone_number = COALESCE(?, phone_number),
      bio = COALESCE(?, bio),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_active = true
  `, [
    username?.toLowerCase(),
    email?.toLowerCase(),
    firstName,
    lastName,
    phoneNumber,
    bio,
    userId
  ]);

  // Get updated user
  const [users] = await db.query(
    'SELECT * FROM users WHERE id = ? AND is_active = true',
    [userId]
  );

  if (!users[0]) {
    throw new ApiError('User not found', 404);
  }

  logger.info('User updated successfully', {
    userId,
    updatedBy: req.user.id
  });

  res.json({
    success: true,
    user: sanitizeUser(users[0])
  });
});

// Soft delete user (admin only)
const deleteUser = catchAsync(async (req, res) => {
  const userId = req.params.id;

  // Prevent deleting self
  if (req.user.id === parseInt(userId)) {
    throw new ApiError('Cannot delete your own account', 400);
  }

  // Soft delete user
  const [result] = await db.query(`
    UPDATE users 
    SET 
      is_active = false,
      deactivated_at = CURRENT_TIMESTAMP,
      deactivated_by = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_active = true
  `, [req.user.id, userId]);

  if (result.affectedRows === 0) {
    throw new ApiError('User not found', 404);
  }

  logger.info('User deleted successfully', {
    userId,
    deletedBy: req.user.id
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Get user profile
const getProfile = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError('User not authenticated', 401);
  }

  const user = await User.findById(req.user.id);
  // Remove sensitive data
  delete user.password;
  
  res.json({ success: true, data: user });
});

// Update user profile
const updateProfile = catchAsync(async (req, res) => {
  const { username, email, first_name, last_name, phone_number, bio } = req.body;
  const userId = req.user.id;

  try {
    // Input validation
    if (!username || !email || !first_name || !last_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields missing' 
      });
    }

    // Check if username is taken (excluding current user)
    const usernameExists = await db.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );

    if (usernameExists[0].length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }

    // Check if email is taken (excluding current user)
    const emailExists = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (emailExists[0].length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already taken'
      });
    }

    // Update user profile
    const [result] = await db.query(
      `UPDATE users 
       SET username = ?, 
           email = ?, 
           first_name = ?, 
           last_name = ?, 
           phone_number = ?, 
           bio = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [username, email, first_name, last_name, phone_number || null, bio || null, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get updated user data
    const [updatedUser] = await db.query(
      `SELECT id, username, email, first_name, last_name, phone_number, bio, 
              created_at, updated_at, is_admin, is_verified, is_active 
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    if (updatedUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Failed to retrieve updated user data'
      });
    }

    // Remove sensitive data
    delete updatedUser[0].password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user test history
const getTestHistory = catchAsync(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM test_results WHERE user_id = ?',
      [req.user.id]
    );
    const total = countResult[0]?.total || 0;

    // Get paginated results
    const [tests] = await db.query(`
      SELECT 
        tr.*,
        s.name as subject_name
      FROM test_results tr
      LEFT JOIN subjects s ON s.id = tr.subject_id
      WHERE tr.user_id = ?
      ORDER BY tr.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, limit, offset]);

    res.json({
      success: true,
      data: tests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching test history:', error);
    throw new ApiError('Failed to fetch test history', 500);
  }
});

// Get specific test result
const getTestById = catchAsync(async (req, res) => {
  const [tests] = await db.query(`
    SELECT 
      tr.*,
      t.title as test_name,
      t.description,
      t.total_questions,
      t.duration,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'question_id', tq.question_id,
          'user_answer', tq.user_answer,
          'is_correct', tq.is_correct,
          'points', tq.points
        )
      ) as questions
    FROM test_results tr
    JOIN tests t ON t.id = tr.test_id
    LEFT JOIN test_questions tq ON tq.test_result_id = tr.id
    WHERE tr.id = ? AND tr.user_id = ?
    GROUP BY tr.id
  `, [req.params.id, req.user.id]);

  if (!tests[0]) {
    throw new ApiError('Test result not found', 404);
  }

  const test = tests[0];
  test.questions = JSON.parse(test.questions);

  res.json({
    success: true,
    test: {
      id: test.id,
      testName: test.test_name,
      description: test.description,
      score: test.score,
      totalQuestions: test.total_questions,
      duration: test.duration,
      timeTaken: test.time_taken,
      completedAt: test.created_at,
      questions: test.questions
    }
  });
});

// Get user settings
const getSettings = catchAsync(async (req, res) => {
  const [settings] = await db.query(
    'SELECT * FROM user_settings WHERE user_id = ?',
    [req.user.id]
  );

  // Return default settings if none exist
  const userSettings = settings[0] || {
    email_notifications: true,
    dark_mode: false,
    show_progress: true,
    auto_save_answers: true,
    language: 'en',
    timezone: 'UTC'
  };

  res.json({
    success: true,
    settings: {
      emailNotifications: userSettings.email_notifications,
      darkMode: userSettings.dark_mode,
      showProgress: userSettings.show_progress,
      autoSaveAnswers: userSettings.auto_save_answers,
      language: userSettings.language,
      timezone: userSettings.timezone
    }
  });
});

// Update user settings
const updateSettings = catchAsync(async (req, res) => {
  const { setting, value } = req.body;

  // Validate setting name
  const validSettings = [
    'emailNotifications',
    'darkMode',
    'showProgress',
    'autoSaveAnswers',
    'language',
    'timezone'
  ];

  if (!validSettings.includes(setting)) {
    throw new ApiError('Invalid setting', 400);
  }

  // Convert camelCase to snake_case
  const dbSetting = setting.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

  // Validate value type
  const settingTypes = {
    email_notifications: 'boolean',
    dark_mode: 'boolean',
    show_progress: 'boolean',
    auto_save_answers: 'boolean',
    language: 'string',
    timezone: 'string'
  };

  if (typeof value !== settingTypes[dbSetting]) {
    throw new ApiError(`Invalid value type for setting ${setting}`, 400);
  }

  // Update user settings
  await db.query(`
    UPDATE user_settings 
    SET 
      ${dbSetting} = ?
    WHERE user_id = ?
  `, [value, req.user.id]);

  res.json({
    success: true,
    message: 'User settings updated successfully'
  });
});

// Get user performance statistics
const getPerformanceStats = catchAsync(async (req, res) => {
  try {
    // Get overall performance stats
    const [overallStats] = await db.query(`
      SELECT 
        COUNT(*) as totalTests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedTests,
        ROUND(AVG(CASE WHEN status = 'completed' THEN score END), 2) as averageScore,
        ROUND(AVG(CASE WHEN status = 'completed' THEN time_taken END), 2) as averageTime
      FROM test_results
      WHERE user_id = ?
    `, [req.user.id]);

    // Get performance by category
    const [categoryStats] = await db.query(`
      SELECT 
        t.category,
        COUNT(*) as totalTests,
        COUNT(CASE WHEN tr.status = 'completed' THEN 1 END) as completedTests,
        ROUND(AVG(CASE WHEN tr.status = 'completed' THEN tr.score END), 2) as averageScore,
        ROUND(AVG(CASE WHEN tr.status = 'completed' THEN tr.time_taken END), 2) as averageTime
      FROM test_results tr
      JOIN tests t ON t.id = tr.test_id
      WHERE tr.user_id = ?
      GROUP BY t.category
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        overall: overallStats[0] || {
          totalTests: 0,
          completedTests: 0,
          averageScore: 0,
          averageTime: 0
        },
        categories: categoryStats || []
      }
    });
  } catch (error) {
    // If table doesn't exist or other database error, return empty results
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
      res.json({
        success: true,
        data: {
          overall: {
            totalTests: 0,
            completedTests: 0,
            averageScore: 0,
            averageTime: 0
          },
          categories: []
        }
      });
    } else {
      throw error;
    }
  }
});

// Get recent performance history
const getPerformanceHistory = catchAsync(async (req, res) => {
  try {
    const { limit = 10, category } = req.query;
    
    let query = `
      SELECT 
        tr.*,
        t.title as test_name,
        t.category,
        t.difficulty
      FROM test_results tr
      JOIN tests t ON t.id = tr.test_id
      WHERE tr.user_id = ?
    `;
    const params = [req.user.id];

    if (category) {
      query += ' AND t.category = ?';
      params.push(category);
    }

    query += ' ORDER BY tr.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [history] = await db.query(query, params);

    res.json({ 
      success: true, 
      data: history.map(item => ({
        id: item.id,
        testName: item.test_name,
        category: item.category,
        difficulty: item.difficulty,
        score: item.score,
        timeTaken: item.time_taken,
        completedAt: item.created_at,
        status: item.status
      }))
    });
  } catch (error) {
    // If table doesn't exist or other database error, return empty results
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
      res.json({
        success: true,
        data: []
      });
    } else {
      throw error;
    }
  }
});

// Get user performance details for a specific test
const getTestPerformance = catchAsync(async (req, res) => {
  try {
    const { testId } = req.params;
    
    const [performance] = await db.query(`
      SELECT 
        tr.*,
        t.title as test_name,
        t.category,
        t.difficulty
      FROM test_results tr
      JOIN tests t ON t.id = tr.test_id
      WHERE tr.id = ? AND tr.user_id = ?
    `, [testId, req.user.id]);

    if (!performance[0]) {
      throw new ApiError('Performance record not found', 404);
    }

    res.json({ 
      success: true, 
      data: {
        id: performance[0].id,
        testName: performance[0].test_name,
        category: performance[0].category,
        difficulty: performance[0].difficulty,
        score: performance[0].score,
        timeTaken: performance[0].time_taken,
        completedAt: performance[0].created_at,
        status: performance[0].status
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // If table doesn't exist or other database error, return 404
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
      throw new ApiError('Performance record not found', 404);
    }
    throw error;
  }
});

// Delete user account
const deleteAccount = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError('User not authenticated', 401);
  }

  // Start transaction
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Delete user's test results and answers
    await connection.query(
      'DELETE FROM test_answers WHERE test_result_id IN (SELECT id FROM test_results WHERE user_id = ?)',
      [req.user.id]
    );
    
    await connection.query(
      'DELETE FROM test_results WHERE user_id = ?',
      [req.user.id]
    );

    // Delete user's settings
    await connection.query(
      'DELETE FROM user_settings WHERE user_id = ?',
      [req.user.id]
    );

    // Finally, delete the user
    await connection.query(
      'DELETE FROM users WHERE id = ?',
      [req.user.id]
    );

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error deleting account:', error);
    throw new ApiError('Failed to delete account', 500);
  } finally {
    connection.release();
  }
});

// Export all functions
module.exports = { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getProfile, 
  updateProfile, 
  getTestHistory, 
  getTestById, 
  getSettings, 
  updateSettings,
  getPerformanceStats,
  getPerformanceHistory,
  deleteAccount,
  getTestPerformance
};