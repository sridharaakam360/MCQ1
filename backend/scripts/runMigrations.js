const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
const logger = require('../config/logger');
const config = require('../config/env');

async function runMigrations() {
  let connection;
  try {
    logger.info('Starting database migrations...');

    // Create connection without database
    connection = await mysql.createConnection({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      multipleStatements: true
    });

    // Create database if it doesn't exist
    logger.info(`Creating database ${config.db.database} if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.db.database}`);
    await connection.query(`USE ${config.db.database}`);

    // Create migrations table if it doesn't exist
    logger.info('Creating migrations table if it\'s not exist...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of executed migrations
    const [executedMigrations] = await connection.query('SELECT name FROM migrations');
    const executedMigrationNames = new Set(executedMigrations.map(m => m.name));

    // Read and execute all migration files in order
    logger.info('Reading migration files...');
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = (await fs.readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure migrations run in order
    
    for (const file of files) {
      if (executedMigrationNames.has(file)) {
        logger.info(`Migration ${file} already executed, skipping...`);
        continue;
      }

      logger.info(`Running migration: ${file}`);
      const migrationSQL = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      
      try {
        await connection.beginTransaction();
        
        // Execute migration
        await connection.query(migrationSQL);
        
        // Record migration execution
        await connection.query(
          'INSERT INTO migrations (name) VALUES (?)',
          [file]
        );
        
        await connection.commit();
        logger.info(`Migration ${file} completed successfully`);
      } catch (err) {
        await connection.rollback();
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migrations
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed successfully');
      process.exit(0);
    })
    .catch(err => {
      logger.error('Migration process failed:', err);
      process.exit(1);
    });
}

module.exports = runMigrations;
