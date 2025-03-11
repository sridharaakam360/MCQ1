const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'login@2021',
  database: 'gpat_pyq_db'
};

async function activateUser(userId) {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully');

    // First, check if user exists
    const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      console.error('User not found');
      process.exit(1);
    }

    // Update user to be admin and active
    await connection.query(
      'UPDATE users SET is_admin = TRUE, status = ? WHERE id = ?',
      ['active', userId]
    );

    console.log('User activated successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Get user ID from command line argument
const userId = process.argv[2];
if (!userId) {
  console.error('Please provide a user ID');
  process.exit(1);
}

activateUser(userId); 