const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'login@2021',
  database: 'gpat_pyq_db'
};

async function deleteUser() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully');

    // Delete user
    console.log('Deleting user...');
    await connection.query('DELETE FROM users WHERE email = ?', ['thara@123.com']);

    console.log('User deleted successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

deleteUser(); 