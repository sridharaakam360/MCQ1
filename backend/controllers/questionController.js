const db = require('../config/db').pool;

const xlsx = require('xlsx');
const logger = require('../config/logger');
const { ApiError } = require('../utils/errors');
const { catchAsync } = require('../utils/errors');
const { validateQuestion } = require('../utils/validation');
const cache = require('../config/cache');

// Function to handle errors
const handleError = (res, error, message, statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ message, error: error.message });
};

// Helper function to normalize answer
const normalizeAnswer = (answer) => {
  if (!answer) return null;
  return String(answer).trim().toLowerCase();
};

// Get all questions with pagination and caching
const getAllQuestions = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  // Try to get from cache first
  const cacheKey = `questions:all:${page}:${limit}`;
  const cachedResult = await cache.get(cacheKey);
  
  if (cachedResult) {
    return res.json(JSON.parse(cachedResult));
  }

  // Get total count
  const [countResult] = await db.query('SELECT COUNT(*) as total FROM questions WHERE is_active = true');
  const total = countResult[0].total;

  // Get paginated questions
  const [questions] = await db.query(`
    SELECT 
      q.*,
      s.name as subject_name,
      s.code as subject_code
    FROM questions q
    LEFT JOIN subjects s ON q.subject_id = s.id
    WHERE q.is_active = true
    ORDER BY q.created_at DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  const result = {
    success: true,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    questions
  };

  // Cache for 5 minutes
  await cache.set(cacheKey, JSON.stringify(result), 300);

  res.json(result);
});

// Get questions by filters with caching
const getQuestionsByFilters = catchAsync(async (req, res) => {
  const { subject_id, difficulty, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  // Generate cache key based on filters
  const cacheKey = `questions:filtered:${JSON.stringify(req.query)}`;
  const cachedResult = await cache.get(cacheKey);

  if (cachedResult) {
    return res.json(JSON.parse(cachedResult));
  }

  let query = `
    SELECT 
      q.*,
      s.name AS subject_name,
      s.code AS subject_code
    FROM questions q
    LEFT JOIN subjects s ON q.subject_id = s.id
    WHERE q.is_active = true
  `;
  const params = [];

  if (subject_id) {
    query += ' AND q.subject_id IN (?)';
    params.push(subject_id.split(','));
  }

  if (difficulty) {
    query += ' AND q.degree IN (?)';
    params.push(difficulty.split(','));
  }

  if (search) {
    query += ' AND (q.question LIKE ? OR q.option1 LIKE ? OR q.option2 LIKE ? OR q.option3 LIKE ? OR q.option4 LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Get total count for pagination
  const countQuery = query.replace('q.*, s.name AS subject_name, s.code AS subject_code', 'COUNT(*) as total');
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

  // Add pagination
  query += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [questions] = await db.query(query, params);

  const result = {
    success: true,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    questions
  };

  // Cache for 5 minutes
  await cache.set(cacheKey, JSON.stringify(result), 300);

  res.json(result);
});

// Get question by ID with caching
const getQuestionById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const cacheKey = `questions:${id}`;
  const cachedQuestion = await cache.get(cacheKey);

  if (cachedQuestion) {
    return res.json(JSON.parse(cachedQuestion));
  }

  const [questions] = await db.query(`
    SELECT 
      q.*,
      s.name as subject_name,
      s.code as subject_code,
      u.username as created_by_user
    FROM questions q
    LEFT JOIN subjects s ON q.subject_id = s.id
    LEFT JOIN users u ON q.created_by = u.id
    WHERE q.id = ? AND q.is_active = true
  `, [id]);

  if (!questions[0]) {
    throw new ApiError('Question not found', 404);
  }

  const result = {
    success: true,
    question: questions[0]
  };

  // Cache for 1 hour
  await cache.set(cacheKey, JSON.stringify(result), 3600);

  res.json(result);
});

// Update question with validation
const updateQuestion = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Validate input
  const validation = validateQuestion(updates);
  if (!validation.isValid) {
    throw new ApiError(validation.message, 400);
  }

  // Check if question exists
  const [existing] = await db.query(
    'SELECT id FROM questions WHERE id = ? AND is_active = true',
    [id]
  );

  if (!existing[0]) {
    throw new ApiError('Question not found', 404);
  }

  // Update question
  await db.query(`
    UPDATE questions 
    SET 
      question = ?,
      subject_id = ?,
      year = ?,
      answer = ?,
      option1 = ?,
      option2 = ?,
      option3 = ?,
      option4 = ?,
      degree = ?,
      updated_at = CURRENT_TIMESTAMP,
      updated_by = ?
    WHERE id = ? AND is_active = true
  `, [
    updates.question,
    updates.subject_id,
    updates.year,
    normalizeAnswer(updates.answer),
    updates.option1,
    updates.option2,
    updates.option3,
    updates.option4,
    updates.degree,
    req.user.id,
    id
  ]);

  // Clear cache for this question
  await cache.del(`questions:${id}`);

  res.json({
    success: true,
    message: 'Question updated successfully'
  });
});

// Soft delete question
const deleteQuestion = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Check if question exists and is active
  const [existing] = await db.query(
    'SELECT id FROM questions WHERE id = ? AND is_active = true',
    [id]
  );

  if (!existing[0]) {
    throw new ApiError('Question not found', 404);
  }

  // Soft delete
  await db.query(`
    UPDATE questions 
    SET 
      is_active = false,
      deleted_at = CURRENT_TIMESTAMP,
      deleted_by = ?
    WHERE id = ?
  `, [req.user.id, id]);

  // Clear related caches
  await Promise.all([
    cache.del(`questions:${id}`),
    cache.del('questions:all:*'),
    cache.del('questions:filtered:*'),
    cache.del('questions:years')
  ]);

  logger.info('Question deleted successfully', {
    questionId: id,
    deletedBy: req.user.id
  });

  res.json({
    success: true,
    message: 'Question deleted successfully'
  });
});

// Bulk upload questions from Excel with validation and transaction
const updateQuestionsFromFile = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError('No file uploaded', 400);
  }

  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  if (data.length === 0) {
    throw new ApiError('The uploaded file contains no data', 400);
  }

  // Start transaction
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const results = {
      total: data.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Get all subjects for validation
    const [subjects] = await connection.query('SELECT id, name FROM subjects');
    const subjectMap = new Map(subjects.map(s => [s.name.toLowerCase(), s.id]));

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row number (1-indexed + header row)

      try {
        // Validate row data
        const validation = validateQuestion(row);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }

        // Get subject_id
        const subjectId = subjectMap.get(row.subject.toLowerCase());
        if (!subjectId) {
          throw new Error(`Invalid subject: "${row.subject}"`);
        }

        // Insert question
        await connection.query(`
          INSERT INTO questions (
            year,
            subject_id,
            question,
            answer,
            option1,
            option2,
            option3,
            option4,
            degree,
            created_by,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          row.year,
          subjectId,
          row.question,
          normalizeAnswer(row.answer),
          row.option1,
          row.option2,
          row.option3,
          row.option4,
          row.degree || null,
          req.user.id
        ]);

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          question: row.question?.substring(0, 50),
          error: error.message
        });
      }
    }

    // Commit transaction if there were any successful inserts
    if (results.successful > 0) {
      await connection.commit();

      // Clear related caches
      await Promise.all([
        cache.del('questions:all:*'),
        cache.del('questions:filtered:*'),
        cache.del('questions:years')
      ]);

      logger.info('Questions uploaded successfully', {
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        uploadedBy: req.user.id
      });
    } else {
      await connection.rollback();
    }

    res.json({
      success: true,
      message: `Processed ${results.total} questions: ${results.successful} successful, ${results.failed} failed`,
      results
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// Get random questions for test with caching
const getRandomQuestions = catchAsync(async (req, res) => {
  const { subject_id, count = 10, difficulty } = req.query;
  
  let query = `
    SELECT 
      q.id,
      q.question,
      q.option1,
      q.option2,
      q.option3,
      q.option4,
      q.answer,
      q.degree,
      s.name as subject_name,
      s.code as subject_code,
      s.id as subject_id
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    WHERE q.is_active = true
  `;

  const params = [];

  if (subject_id) {
    query += ' AND q.subject_id IN (?)';
    params.push(subject_id.split(','));
  }

  if (difficulty) {
    query += ' AND q.degree IN (?)';
    params.push(difficulty.split(','));
  }
  
  query += ' ORDER BY RAND()';
  
  if (count) {
    query += ' LIMIT ?';
    params.push(parseInt(count));
  }

  const [questions] = await db.query(query, params);

  if (!questions || questions.length === 0) {
    throw new ApiError('No questions found', 404);
  }

  // Format questions for the test
  const formattedQuestions = questions.map(q => ({
    id: q.id,
    question: q.question,
    options: {
      a: q.option1,
      b: q.option2,
      c: q.option3,
      d: q.option4
    },
    subject: {
      id: q.subject_id,
      name: q.subject_name,
      code: q.subject_code
    },
    difficulty: q.degree
  }));

  res.json({
    success: true,
    count: formattedQuestions.length,
    questions: formattedQuestions
  });
});

// Calculate test time based on questions
const calculateTestTime = catchAsync(async (req, res) => {
  const { questions } = req.body;

  if (!Array.isArray(questions) && !Number.isInteger(questions)) {
    throw new ApiError('Invalid questions parameter. Must be an array of question IDs or a number of questions.', 400);
  }

  // Simple time settings (in seconds)
  const TIME_PER_QUESTION = 60; // 1 minute (60 seconds) per question
  const BUFFER_PERCENTAGE = 0.10; // 10% buffer time
  const AUTO_SUBMIT_WARNING = 30; // Show warning when 30 seconds remaining

  let numberOfQuestions;
  if (Array.isArray(questions)) {
    numberOfQuestions = questions.length;
    if (numberOfQuestions === 0) {
      throw new ApiError('Questions array cannot be empty', 400);
    }
  } else {
    // If just a number is provided
    numberOfQuestions = Math.max(1, Math.min(questions, 100)); // Limit between 1 and 100 questions
  }

  // Calculate base time in seconds
  const baseTimeSeconds = numberOfQuestions * TIME_PER_QUESTION;
  
  // Calculate buffer time in seconds
  const bufferTimeSeconds = Math.ceil(baseTimeSeconds * BUFFER_PERCENTAGE);
  
  // Calculate total time in seconds
  const totalTimeSeconds = baseTimeSeconds + bufferTimeSeconds;

  // Convert to minutes for display
  const baseTimeMinutes = Math.floor(baseTimeSeconds / 60);
  const bufferTimeMinutes = Math.ceil(bufferTimeSeconds / 60);
  const totalTimeMinutes = Math.ceil(totalTimeSeconds / 60);

  console.log('Timer calculation:', {
    numberOfQuestions,
    baseTimeSeconds,
    bufferTimeSeconds,
    totalTimeSeconds,
    baseTimeMinutes,
    bufferTimeMinutes,
    totalTimeMinutes
  });

  const response = {
    success: true,
    data: {
      numberOfQuestions,
      timePerQuestion: TIME_PER_QUESTION,
      totalTimeInSeconds: totalTimeSeconds,
      totalTimeMinutes: totalTimeMinutes,
      bufferTimeSeconds: bufferTimeSeconds,
      autoSubmit: {
        enabled: true,
        warningSeconds: AUTO_SUBMIT_WARNING
      },
      breakdown: {
        baseTimeSeconds,
        bufferTimeSeconds,
        baseTimeMinutes,
        bufferTimeMinutes
      }
    }
  };

  res.json(response);
});

// Export all functions
module.exports = {
  getAllQuestions,
  getQuestionsByFilters,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  updateQuestionsFromFile,
  getRandomQuestions,
  calculateTestTime
};