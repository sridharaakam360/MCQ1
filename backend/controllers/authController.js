const db = require('../config/db').pool;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const config = require('../config/env');
const { validatePassword, sanitizeUser } = require('../utils/validation');
const { generateTokens, verifyToken } = require('../utils/auth');
const { ApiError } = require('../utils/errors');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

// Helper function to generate tokens
const generateToken = (payload, expiresIn = '1h') => {
  if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      throw new Error('Server configuration error');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn,
      algorithm: 'HS256'
  });
};

// Error handling function
const handleError = (res, error, message, statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ message, error: error.message });
};

// Sign In Function
const signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      throw new ApiError('Email and password are required', 400);
    }

    // Get user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ? AND status = "active"',
      [email.toLowerCase()]
    );

    const user = users[0];
    if (!user) {
      throw new ApiError('Invalid email or password', 401);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError('Invalid email or password', 401);
    }

    // Generate both access and refresh tokens
    const { accessToken, refreshToken } = await generateTokens(user);

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    logger.info('User signed in successfully', {
      userId: user.id,
      email: user.email
    });

    res.json({
      success: true,
      accessToken,
      token: accessToken,
      refreshToken,
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

// Sign Up Function
const signUp = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    // Input validation
    if (!email || !password || !fullName) {
      throw new ApiError('Email, password and full name are required', 400);
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new ApiError(passwordValidation.message, 400);
    }

    // Check for existing user with detailed error messages
    const [existingUsers] = await db.query(
      'SELECT email FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      logger.warn('Registration attempt with existing email', { email });
      throw new ApiError('An account with this email already exists. Please try signing in or use a different email address.', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [result] = await db.query(
      `INSERT INTO users (
        email,
        password,
        full_name,
        role,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 'user', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        email.toLowerCase(),
        hashedPassword,
        fullName
      ]
    );

    logger.info('User registered successfully', {
      userId: result.insertId,
      email
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please sign in.',
      user: {
        id: result.insertId,
        email,
        fullName,
        role: 'user',
        status: 'active'
      }
    });
  } catch (error) {
    // Log the error but don't expose internal details to the client
    logger.error('Registration error:', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    
    // Pass the error to the error handling middleware
    next(error);
  }
};

// Get Current User
const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError('User not authenticated', 401);
    }

    const userId = req.user.id;
    
    const [users] = await db.query(
      `SELECT 
        id, 
        email, 
        full_name,
        role,
        status,
        created_at,
        updated_at
      FROM users 
      WHERE id = ? AND status = "active"`,
      [userId]
    );
    
    if (!users[0]) {
      throw new ApiError('User not found', 404);
    }

    // Get user stats
    const [stats] = await db.query(
      `SELECT 
        COUNT(id) as total_tests,
        ROUND(AVG(score), 2) as avg_score,
        SUM(time_taken) as total_time,
        MAX(score) as highest_score,
        MIN(score) as lowest_score
      FROM test_results
      WHERE user_id = ?`,
      [userId]
    );

    const userStats = stats[0] || {
      total_tests: 0,
      avg_score: 0,
      total_time: 0,
      highest_score: 0,
      lowest_score: 0
    };

    res.json({
      success: true,
      data: {
        user: {
          ...sanitizeUser(users[0]),
          stats: userStats
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh Token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError('Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Get user
    const [users] = await db.query(
      'SELECT id, email, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    const user = users[0];
    if (!user || !user.is_active) {
      throw new ApiError('Invalid refresh token', 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

    res.json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError('Invalid refresh token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError('Refresh token has expired', 401));
    } else {
      next(error);
    }
  }
};

// Sign Out
const signOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    logger.info('User signed out successfully', { userId });
    res.clearCookie('refreshToken');
    res.json({
      success: true,
      message: 'Signed out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Change Password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Input validation
    if (!currentPassword || !newPassword) {
      throw new ApiError('Current password and new password are required', 400);
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new ApiError(passwordValidation.message, 400);
    }
    
    // Get current user
    const [users] = await db.query(
      'SELECT password FROM users WHERE id = ? AND is_active = true',
      [userId]
    );
    
    if (!users[0]) {
      throw new ApiError('User not found', 404);
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) {
      throw new ApiError('Current password is incorrect', 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await db.query(
      `UPDATE users 
       SET password = ?,
           password_changed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [hashedPassword, userId]
    );

    logger.info('Password changed successfully', { userId });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Resend Verification Email
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError('Email is required', 400);
    }

    // Get user
    const [users] = await db.query(
      'SELECT id, email, is_verified FROM users WHERE email = ? AND is_active = true',
      [email.toLowerCase()]
    );

    const user = users[0];
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (user.is_verified) {
      throw new ApiError('Email is already verified', 400);
    }

    // Generate new verification token
    const verificationToken = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.verifyEmailExpirationHours }
    );

    // Update verification token in database
    await db.query(
      `UPDATE users 
       SET verification_token = ?,
           verification_token_expires = DATE_ADD(NOW(), INTERVAL ? HOUR)
       WHERE id = ?`,
      [verificationToken, parseInt(config.jwt.verifyEmailExpirationHours), user.id]
    );

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Verify Email
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new ApiError('Verification token is required', 400);
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Get user
    const [users] = await db.query(
      `SELECT id, email, is_verified 
       FROM users 
       WHERE id = ? AND is_active = true`,
      [decoded.userId]
    );

    const user = users[0];
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (user.is_verified) {
      throw new ApiError('Email is already verified', 400);
    }

    // Update user verification status
    await db.query(
      `UPDATE users 
       SET is_verified = true,
           verification_token = NULL,
           verification_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [user.id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError('Invalid verification token', 400));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError('Verification token has expired', 400));
    } else {
      next(error);
    }
  }
};

// Forgot Password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError('Email is required', 400);
    }

    // Get user
    const [users] = await db.query(
      'SELECT id, email, is_active FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    const user = users[0];
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });
    }

    if (!user.is_active) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.resetPasswordExpirationMinutes }
    );

    // Update user with reset token
    await db.query(
      `UPDATE users 
       SET reset_token = ?,
           reset_token_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE id = ?`,
      [resetToken, parseInt(config.jwt.resetPasswordExpirationMinutes), user.id]
    );

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken);

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.'
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new ApiError('Reset token and new password are required', 400);
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new ApiError(passwordValidation.message, 400);
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Get user with valid reset token
    const [users] = await db.query(
      `SELECT id, email, is_active 
       FROM users 
       WHERE id = ? 
       AND reset_token = ? 
       AND reset_token_expires_at > NOW()`,
      [decoded.userId, token]
    );

    const user = users[0];
    if (!user) {
      throw new ApiError('Invalid or expired reset token', 400);
    }

    if (!user.is_active) {
      throw new ApiError('Account is inactive', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await db.query(
      `UPDATE users 
       SET password = ?,
           reset_token = NULL,
           reset_token_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError('Invalid reset token', 400));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError('Reset token has expired', 400));
    } else {
      next(error);
    }
  }
};

module.exports = {
  signIn,
  signUp,
  getCurrentUser,
  refreshToken,
  signOut,
  changePassword,
  resendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword
};