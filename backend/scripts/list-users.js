const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'login@2021',
  database: 'gpat_pyq_db'
};

async function listUsers() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully');

    const [users] = await connection.query(`
      SELECT 
        id, 
        username, 
        email, 
        first_name,
        last_name,
        phone_number,
        is_admin,
        is_active,
        is_verified,
        last_login,
        created_at,
        updated_at
      FROM users
    `);
    
    console.log('\nUsers in database:');
    console.log('----------------');
    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`First Name: ${user.first_name}`);
      console.log(`Last Name: ${user.last_name}`);
      console.log(`Phone: ${user.phone_number}`);
      console.log(`Admin: ${user.is_admin}`);
      console.log(`Active: ${user.is_active}`);
      console.log(`Verified: ${user.is_verified}`);
      console.log(`Last Login: ${user.last_login}`);
      console.log(`Created At: ${user.created_at}`);
      console.log(`Updated At: ${user.updated_at}`);
      console.log('----------------');
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

listUsers(); 