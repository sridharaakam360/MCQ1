const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'login@2021',
  database: 'gpat_pyq_db'
};

async function addUserStatus() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully');

    // Check if status column exists
    console.log('Checking status column...');
    const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE ?', ['status']);
    
    if (columns.length === 0) {
      // Add status column if it doesn't exist
      console.log('Adding status column...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN status ENUM('active', 'inactive', 'suspended') 
        NOT NULL DEFAULT 'active'
      `);
    } else {
      console.log('Status column already exists');
    }

    // Add your user account
    console.log('Adding user account...');
    const hashedPassword = '$2b$10$5dwsS5snIRlKu8ka5r5UxOB0ABjr5MQHGkd4cRE/nJBLU5CsXqk5m'; // This is a hashed version of 'admin123'
    await connection.query(`
      INSERT INTO users (username, password, email, is_admin, status)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      password = VALUES(password),
      is_admin = VALUES(is_admin),
      status = VALUES(status)
    `, ['thara', hashedPassword, 'thara@123.com', true, 'active']);

    console.log('Database updated successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addUserStatus(); 