const bcrypt = require('bcryptjs');
const db = require('../config/db').pool;
const logger = require('../config/logger');
const config = require('../config/env');
const { validatePassword, validateEmail } = require('../utils/validation');

// Default admin user configuration
const DEFAULT_ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
  firstName: 'System',
  lastName: 'Administrator'
};

async function insertAdminUser(adminData = DEFAULT_ADMIN) {
  let connection;
  try {
    logger.info('Starting admin user creation...');

    // Validate admin password
    const { isValid: isPasswordValid, message: passwordMessage } = validatePassword(adminData.password);
    if (!isPasswordValid) {
      throw new Error(`Invalid admin password: ${passwordMessage}`);
    }

    // Validate admin email
    const { isValid: isEmailValid, message: emailMessage } = validateEmail(adminData.email);
    if (!isEmailValid) {
      throw new Error(`Invalid admin email: ${emailMessage}`);
    }

    // Get connection from pool
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if admin user already exists
    const [existingAdmin] = await connection.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [adminData.username, adminData.email]
    );

    if (existingAdmin.length > 0) {
      logger.info('Admin user already exists');
      await connection.commit();
      return existingAdmin[0].id;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(12); // Using higher rounds for admin password
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    // Insert admin user
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
        created_at
      ) VALUES (?, ?, ?, ?, ?, true, true, true, CURRENT_TIMESTAMP)`,
      [
        adminData.username,
        adminData.email,
        hashedPassword,
        adminData.firstName,
        adminData.lastName
      ]
    );

    await connection.commit();
    logger.info('Admin user created successfully:', result.insertId);
    return result.insertId;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    logger.error('Error creating admin user:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  insertAdminUser()
    .then(() => {
      logger.info('Admin user creation completed successfully');
      process.exit(0);
    })
    .catch(err => {
      logger.error('Admin user creation failed:', err);
      process.exit(1);
    });
}

module.exports = insertAdminUser;




