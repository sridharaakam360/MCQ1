const bcrypt = require('bcryptjs');
const db = require('../config/db').pool;
const logger = require('../config/logger');
const { validatePassword } = require('../utils/validation');

// Test user data
const TEST_USER = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Test@123',
  firstName: 'Test',
  lastName: 'User',
  isVerified: true
};

// Sample questions by subject
const SAMPLE_QUESTIONS = [
  {
    subject: 'Pharmaceutical Chemistry',
    questions: [
      {
        text: 'Which functional group is responsible for the analgesic activity of paracetamol?',
        options: ['Hydroxyl', 'Amine', 'Amide', 'Carboxyl'],
        correct: 'C',
        year: 2023,
        difficulty: 'medium'
      },
      {
        text: 'What is the primary mechanism of action of aspirin?',
        options: ['COX inhibition', 'Beta-blocking', 'ACE inhibition', 'Channel blocking'],
        correct: 'A',
        year: 2023,
        difficulty: 'easy'
      }
    ]
  },
  {
    subject: 'Pharmaceutics',
    questions: [
      {
        text: 'Which type of flow is exhibited by pseudoplastic materials?',
        options: ['Newtonian', 'Non-newtonian', 'Dilatant', 'Plastic'],
        correct: 'B',
        year: 2024,
        difficulty: 'hard'
      },
      {
        text: 'What is the purpose of a disintegrant in tablet formulation?',
        options: ['Binding', 'Breaking', 'Flowing', 'Lubricating'],
        correct: 'B',
        year: 2024,
        difficulty: 'easy'
      }
    ]
  }
];

async function createTestUser() {
  try {
    logger.info('Creating test user...');
    
    // Check if test user exists
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [TEST_USER.username, TEST_USER.email]
    );
    
    if (existingUser.length) {
      logger.info('Test user already exists');
      return existingUser[0].id;
    }

    // Validate password
    const { isValid, message } = validatePassword(TEST_USER.password);
    if (!isValid) {
      throw new Error(`Invalid test user password: ${message}`);
    }

    // Create user
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
    const [result] = await db.query(
      `INSERT INTO users (
        username,
        email,
        password,
        first_name,
        last_name,
        is_verified,
        is_active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP)`,
      [
        TEST_USER.username,
        TEST_USER.email,
        hashedPassword,
        TEST_USER.firstName,
        TEST_USER.lastName,
        TEST_USER.isVerified
      ]
    );

    logger.info('Test user created successfully');
    return result.insertId;
  } catch (error) {
    logger.error('Error creating test user:', error);
    throw error;
  }
}

async function addTestPerformance(userId) {
  try {
    logger.info('Adding test performance data...');

    // Clear existing performance data
    await db.query('DELETE FROM test_results WHERE user_id = ?', [userId]);

    // Add sample test results
    const testScores = [75, 82, 68, 90, 85];
    for (const score of testScores) {
      const totalQuestions = 50;
      const correctAnswers = Math.round((score/100) * totalQuestions);
      
      await db.query(
        `INSERT INTO test_results (
          user_id,
          score,
          total_questions,
          correct_answers,
          incorrect_answers,
          completion_time,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL RAND()*30 DAY))`,
        [
          userId,
          score,
          totalQuestions,
          correctAnswers,
          totalQuestions - correctAnswers,
          Math.floor(Math.random() * 30) + 30 // Random time between 30-60 minutes
        ]
      );
    }

    logger.info('Test performance data added successfully');
  } catch (error) {
    logger.error('Error adding test performance:', error);
    throw error;
  }
}

async function addSampleQuestions() {
  try {
    logger.info('Adding sample questions...');

    // Get subject IDs
    const [subjects] = await db.query('SELECT id, name FROM subjects');
    const subjectMap = subjects.reduce((acc, subject) => {
      acc[subject.name] = subject.id;
      return acc;
    }, {});

    // Add questions for each subject
    for (const subjectData of SAMPLE_QUESTIONS) {
      const subjectId = subjectMap[subjectData.subject];
      if (!subjectId) {
        logger.warn(`Subject not found: ${subjectData.subject}`);
        continue;
      }

      for (const q of subjectData.questions) {
        await db.query(
          `INSERT INTO questions (
            subject_id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            year,
            difficulty,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            subjectId,
            q.text,
            q.options[0],
            q.options[1],
            q.options[2],
            q.options[3],
            q.correct,
            q.year,
            q.difficulty
          ]
        );
      }
    }

    logger.info('Sample questions added successfully');
  } catch (error) {
    logger.error('Error adding sample questions:', error);
    throw error;
  }
}

async function seedData() {
  let connection;
  try {
    logger.info('Starting data seeding...');
    
    // Get connection from pool
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Run seeding functions
    const userId = await createTestUser();
    await addTestPerformance(userId);
    await addSampleQuestions();

    await connection.commit();
    logger.info('Data seeding completed successfully');
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    logger.error('Error seeding data:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run seeding
if (require.main === module) {
  seedData()
    .then(() => {
      logger.info('Seeding process completed successfully');
      process.exit(0);
    })
    .catch(err => {
      logger.error('Seeding process failed:', err);
      process.exit(1);
    });
}

module.exports = {
  seedData,
  createTestUser,
  addTestPerformance,
  addSampleQuestions
};
