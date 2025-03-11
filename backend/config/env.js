const joi = require('joi');
const dotenv = require('dotenv');
const path = require('path');
const logger = require('./logger');
const fs = require('fs');

// Load environment variables from .env file
const envPath = path.join(__dirname, '../.env');
console.log('Looking for .env file at:', envPath);

// Read file content and remove BOM if present
const envConfig = {};
const content = fs.readFileSync(envPath, 'utf8').toString();
const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);

// Parse each line manually
lines.forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      envConfig[key.trim()] = value;
      process.env[key.trim()] = value;
    }
  }
});

// Debug: Print parsed config
console.log('Parsed environment config:', envConfig);

// Debug: Print specific variables we need
console.log('Critical environment variables:', {
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  JWT_SECRET: process.env.JWT_SECRET,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USERNAME: process.env.SMTP_USERNAME,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT
});

// Define validation schema for environment variables
const envSchema = joi.object({
  // Node environment
  NODE_ENV: joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Server configuration
  PORT: joi.number()
    .port()
    .default(3000),
  HOST: joi.string()
    .hostname()
    .default('localhost'),
  API_PREFIX: joi.string()
    .default('/api'),

  // Database configuration
  DB_HOST: joi.string()
    .hostname()
    .default('localhost'),
  DB_PORT: joi.number()
    .port()
    .default(3306),
  DB_USER: joi.string()
    .required(),
  DB_PASSWORD: joi.string()
    .required(),
  DB_NAME: joi.string()
    .required(),
  DB_CONNECTION_LIMIT: joi.number()
    .integer()
    .min(1)
    .default(10),
  DB_QUEUE_LIMIT: joi.number()
    .integer()
    .min(0)
    .default(0),
  DB_CONNECT_TIMEOUT: joi.number()
    .integer()
    .min(1000)
    .default(10000),
  DB_ACQUIRE_TIMEOUT: joi.number()
    .integer()
    .min(1000)
    .default(10000),
  DB_TIMEOUT: joi.number()
    .integer()
    .min(1000)
    .default(10000),

  // JWT configuration
  JWT_SECRET: joi.string()
    .required()
    .min(32),
  JWT_ACCESS_EXPIRATION: joi.string()
    .default('15m'),
  JWT_REFRESH_EXPIRATION: joi.string()
    .default('7d'),
  JWT_RESET_PASSWORD_EXPIRATION: joi.string()
    .default('10m'),
  JWT_VERIFY_EMAIL_EXPIRATION: joi.string()
    .default('24h'),

  // Email configuration (optional)
  SMTP_HOST: joi.string()
    .hostname()
    .optional(),
  SMTP_PORT: joi.number()
    .port()
    .optional(),
  SMTP_USERNAME: joi.string()
    .optional(),
  SMTP_PASSWORD: joi.string()
    .optional(),
  EMAIL_FROM: joi.string()
    .email()
    .optional(),

  // Logging configuration
  LOG_LEVEL: joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_DIR: joi.string()
    .default('logs'),
  LOG_MAX_SIZE: joi.string()
    .default('20m'),
  LOG_MAX_FILES: joi.string()
    .default('14d'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: joi.number()
    .integer()
    .min(0)
    .default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX: joi.number()
    .integer()
    .min(0)
    .default(100),

  // File upload
  UPLOAD_LIMIT: joi.string()
    .default('10mb'),
  ALLOWED_FILE_TYPES: joi.string()
    .default('image/jpeg,image/png,application/pdf'),

  // Redis configuration (optional)
  REDIS_URL: joi.string()
    .uri()
    .optional(),
  REDIS_HOST: joi.string()
    .hostname()
    .optional(),
  REDIS_PORT: joi.number()
    .port()
    .optional(),
  REDIS_PASSWORD: joi.string()
    .optional(),

  // Cors configuration
  CORS_ORIGIN: joi.string()
    .default('*'),
  CORS_METHODS: joi.string()
    .default('GET,HEAD,PUT,PATCH,POST,DELETE'),
}).unknown();

// Validate environment variables
const { error, value: env } = envSchema.validate(process.env, {
  stripUnknown: true,
  convert: true,
  abortEarly: false,
});

if (error) {
  logger.error('Environment validation error', {
    error: error.details.map(detail => detail.message).join(', '),
  });
  process.exit(1);
}

// Export validated environment variables
module.exports = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  
  server: {
    port: env.PORT,
    host: env.HOST,
    apiPrefix: env.API_PREFIX,
  },

  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    queueLimit: env.DB_QUEUE_LIMIT,
    connectTimeout: env.DB_CONNECT_TIMEOUT,
    acquireTimeout: env.DB_ACQUIRE_TIMEOUT,
    timeout: env.DB_TIMEOUT,
  },

  jwt: {
    secret: env.JWT_SECRET,
    accessExpirationMinutes: env.JWT_ACCESS_EXPIRATION,
    refreshExpirationDays: env.JWT_REFRESH_EXPIRATION,
    resetPasswordExpirationMinutes: env.JWT_RESET_PASSWORD_EXPIRATION,
    verifyEmailExpirationHours: env.JWT_VERIFY_EMAIL_EXPIRATION,
  },

  email: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: {
        user: env.SMTP_USERNAME,
        pass: env.SMTP_PASSWORD,
      },
    },
    from: env.EMAIL_FROM,
  },

  logging: {
    level: env.LOG_LEVEL,
    dir: env.LOG_DIR,
    maxSize: env.LOG_MAX_SIZE,
    maxFiles: env.LOG_MAX_FILES,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },

  upload: {
    limit: env.UPLOAD_LIMIT,
    allowedTypes: env.ALLOWED_FILE_TYPES.split(','),
  },

  redis: env.REDIS_URL ? {
    url: env.REDIS_URL,
  } : {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },

  cors: {
    origin: env.CORS_ORIGIN,
    methods: env.CORS_METHODS.split(','),
  },
}; 