const mysql = require('mysql2');
const logger = require('./logger');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'login@2021',
  database: process.env.DB_NAME || 'gpat_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  multipleStatements: process.env.NODE_ENV === 'development',
  timezone: 'Z', // UTC timezone
  dateStrings: true,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Monitor pool events
pool.on('connection', (connection) => {
  logger.info('New database connection established', {
    threadId: connection.threadId,
  });

  connection.on('error', (err) => {
    logger.error('Database connection error', {
      threadId: connection.threadId,
      error: err.message,
      code: err.code,
    });
  });
});

pool.on('acquire', (connection) => {
  logger.debug('Connection acquired', {
    threadId: connection.threadId
  });
});

pool.on('release', (connection) => {
  logger.debug('Connection released', {
    threadId: connection.threadId
  });
});

pool.on('enqueue', () => {
  logger.warn('Waiting for available connection slot');
});

// Test and validate connection
async function validateConnection() {
  let retries = 3;
  const retryDelay = 5000; // 5 seconds

  while (retries > 0) {
    try {
      const connection = await promisePool.getConnection();
      
      // Test the connection
      await connection.query('SELECT 1');
      
      logger.info('Database connection established successfully', {
        host: dbConfig.host,
        database: dbConfig.database,
        user: dbConfig.user,
        connectionLimit: dbConfig.connectionLimit,
      });

      connection.release();
      return true;
    } catch (error) {
      retries--;
      logger.error('Database connection error', {
        error: error.message,
        remainingRetries: retries,
        host: dbConfig.host,
        database: dbConfig.database,
      });

      if (retries === 0) {
        throw new Error('Failed to establish database connection after multiple retries');
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', {
    error: err.message,
    code: err.code,
    fatal: err.fatal,
  });

  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    logger.warn('Database connection was lost. Attempting to reconnect...');
  }
});

// Graceful shutdown function
async function closePool() {
  try {
    await promisePool.end();
    logger.info('Database pool closed successfully');
  } catch (error) {
    logger.error('Error closing database pool', {
      error: error.message,
    });
    throw error;
  }
}

// Initialize connection
validateConnection().catch((error) => {
  logger.error('Failed to initialize database connection', {
    error: error.message,
  });
  process.exit(1);
});

// Export pool and utilities
module.exports = {
  pool: promisePool,
  closePool,
  validateConnection,
};