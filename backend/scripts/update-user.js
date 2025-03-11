const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'login@2021',
  database: 'gpat_pyq_db'
};

async function updateUser() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully');

    // Update user data
    console.log('Updating user data...');
    await connection.query(`
      UPDATE users 
      SET 
        username = ?,
        first_name = ?,
        last_name = ?,
        phone_number = ?,
        is_admin = ?,
        is_active = ?,
        is_verified = ?,
        updated_at = NOW()
      WHERE email = ?
    `, [
      'thara123',
      'thara',
      '123',
      '123-456-7890',
      true,
      true,
      true,
      'thara@123.com'
    ]);

    console.log('User updated successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateUser(); 