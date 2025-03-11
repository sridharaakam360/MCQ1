const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
require('dotenv').config();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
require('fs').mkdirSync(logsDir, { recursive: true });

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Write all logs with importance level of 'error' or less to 'error.log'
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      level: 'error',
    }),
    // Write all logs with importance level of 'info' or less to 'combined.log'
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
    })
  ]
});

// If we're not in production, log to the console with custom format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level}] : ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += JSON.stringify(metadata, null, 2);
        }
        return msg;
      })
    )
  }));
}

// Create a stream object with a write function that will be used by Morgan
logger.stream = {
  write: (message) => logger.info(message.trim())
};

module.exports = logger;
