const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'login@2021',
  database: 'gpat_pyq_db'
};

async function insertUser() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully');

    // Insert user data
    console.log('Inserting user data...');
    const hashedPassword = '$2b$10$5dwsS5snIRlKu8ka5r5UxOB0ABjr5MQHGkd4cRE/nJBLU5CsXqk5m'; // This is a hashed version of 'admin123'
    await connection.query(`
      INSERT INTO users (
        username,
        password,
        email,
        first_name,
        last_name,
        phone_number,
        is_admin,
        is_active,
        is_verified,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      'thara123',
      hashedPassword,
      'thara@123.com',
      'thara',
      '123',
      '123-456-7890',
      true,
      true,
      true
    ]);

    console.log('User inserted successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

insertUser(); 