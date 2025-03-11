const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'login@2021',
  multipleStatements: true
};

async function initializeDatabase() {
  let connection;
  try {
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully');

    // Read and execute the SQL file
    console.log('Reading SQL file...');
    const sqlFile = path.join(__dirname, '../db/db.sql');
    const sql = await fs.readFile(sqlFile, 'utf8');
    
    console.log('Executing SQL commands...');
    await connection.query(sql);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase(); 