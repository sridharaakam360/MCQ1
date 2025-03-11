const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'login@2021',
  database: 'gpat_pyq_db'
};

async function addUserColumns() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully');

    // Get existing columns
    const [columns] = await connection.query('SHOW COLUMNS FROM users');
    const columnNames = columns.map(col => col.Field);

    // Define columns to add
    const columnsToAdd = [
      { name: 'first_name', type: 'VARCHAR(255)' },
      { name: 'last_name', type: 'VARCHAR(255)' },
      { name: 'phone_number', type: 'VARCHAR(20)' },
      { name: 'is_verified', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'last_login', type: 'TIMESTAMP NULL' },
      { name: 'password_changed_at', type: 'TIMESTAMP NULL' },
      { name: 'profile_image', type: 'VARCHAR(255)' }
    ];

    // Add missing columns
    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        console.log(`Adding column ${column.name}...`);
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN ${column.name} ${column.type}
        `);
      } else {
        console.log(`Column ${column.name} already exists`);
      }
    }

    console.log('Columns added successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addUserColumns(); 