const bcrypt = require('bcryptjs');
const db = require('../config/db').pool;
const logger = require('../config/logger');

const TEST_ACCOUNTS = {
  admin: {
    username: 'testadmin',
    email: 'testadmin@example.com',
    password: 'Admin@123',
    firstName: 'Test',
    lastName: 'Admin',
    isAdmin: true,
    isVerified: true
  },
  user: {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'User@123',
    firstName: 'Test',
    lastName: 'User',
    isAdmin: false,
    isVerified: true
  }
};

async function resetUsers() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Delete all existing users
    logger.info('Deleting all existing users...');
    await connection.query('DELETE FROM users');

    // Create test accounts
    for (const [role, userData] of Object.entries(TEST_ACCOUNTS)) {
      logger.info(`Creating ${role} account...`);
      
      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Insert user
      const [result] = await connection.query(
        `INSERT INTO users (
          username,
          email,
          password,
          first_name,
          last_name,
          is_admin,
          is_verified,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userData.username.toLowerCase(),
          userData.email.toLowerCase(),
          hashedPassword,
          userData.firstName,
          userData.lastName,
          userData.isAdmin,
          userData.isVerified
        ]
      );

      logger.info(`Created ${role} account with ID: ${result.insertId}`);
    }

    await connection.commit();
    logger.info('Successfully reset users table with test accounts');

    // Log test account credentials
    console.log('\nTest Accounts Created:');
    console.log('----------------------');
    for (const [role, userData] of Object.entries(TEST_ACCOUNTS)) {
      console.log(`\n${role.toUpperCase()}:`);
      console.log(`Username: ${userData.username}`);
      console.log(`Email: ${userData.email}`);
      console.log(`Password: ${userData.password}`);
    }

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    logger.error('Error resetting users:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit();
  }
}

// Run the script
resetUsers().catch(error => {
  logger.error('Failed to reset users:', error);
  process.exit(1);
}); 