const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configure dotenv with explicit path to .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Add debug logging to help troubleshoot environment variables
console.log('Environment variables loaded:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Error: Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`- ${envVar}`));
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  process.exit(1);
}

const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
  multipleStatements: true
};

async function createMigrationsTable(connection) {
  const sql = `
    CREATE TABLE IF NOT EXISTS migrations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await connection.query(sql);
}

async function getExecutedMigrations(connection) {
  const [rows] = await connection.query('SELECT name FROM migrations ORDER BY id');
  return rows.map(row => row.name);
}

async function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = await fs.readdir(migrationsDir);
  return files
    .filter(file => file.endsWith('.sql'))
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[0]);
      const numB = parseInt(b.split('_')[0]);
      return numA - numB;
    });
}

async function executeMigration(connection, migrationFile) {
  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
  const sql = await fs.readFile(migrationPath, 'utf8');
  
  console.log(`Executing migration: ${migrationFile}`);
  await connection.query(sql);
  await connection.query('INSERT INTO migrations (name) VALUES (?)', [migrationFile]);
  console.log(`Successfully executed: ${migrationFile}`);
}

async function checkTables(connection) {
  console.log('\nChecking database tables:');
  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map(table => Object.values(table)[0]);
  
  for (const tableName of tableNames) {
    console.log(`\nTable: ${tableName}`);
    const [columns] = await connection.query(`DESCRIBE ${tableName}`);
    columns.forEach(col => {
      console.log(` - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Default ? 'DEFAULT ' + col.Default : ''}`);
    });
  }
}

async function main() {
  let connection;
  try {
    connection = await mysql.createPool(config);
    
    // Create migrations table if it doesn't exist
    await createMigrationsTable(connection);
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations(connection);
    
    // Get all migration files
    const migrationFiles = await getMigrationFiles();
    
    // Execute pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        await executeMigration(connection, file);
      }
    }
    
    // Check tables if --check flag is provided
    if (process.argv.includes('--check')) {
      await checkTables(connection);
    }
    
    console.log('\nAll migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main(); 