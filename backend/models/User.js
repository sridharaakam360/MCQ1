const db = require('../config/db').pool;
const logger = require('../config/logger');
const { ApiError } = require('../utils/errors');

class User {
  static async findByUsername(username) {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      return rows[0];
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw new ApiError('Failed to find user', 500);
    }
  }

  static async findByEmail(email) {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      return rows[0];
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw new ApiError('Failed to find user', 500);
    }
  }

  static async createUser({ username, password, email, first_name, last_name, phone_number = null, bio = null, profile_image = null, isAdmin = false }) {
    try {
      const [result] = await db.query(
        `INSERT INTO users (
          username, 
          password, 
          email, 
          first_name,
          last_name,
          phone_number,
          bio,
          profile_image,
          is_admin,
          is_verified,
          is_active,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, false, true, CURRENT_TIMESTAMP)`,
        [username, password, email, first_name, last_name, phone_number, bio, profile_image, isAdmin]
      );
      return result.insertId;
    } catch (error) {
      logger.error('Error creating user:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('username')) {
          throw new ApiError('Username already exists', 400);
        }
        if (error.message.includes('email')) {
          throw new ApiError('Email already exists', 400);
        }
      }
      throw new ApiError('Failed to create user', 500);
    }
  }

  static async updateUser(id, userData) {
    try {
      const allowedFields = [
        'username',
        'email',
        'first_name',
        'last_name',
        'phone_number',
        'bio',
        'profile_image'
      ];
      const updates = [];
      const values = [];

      allowedFields.forEach(field => {
        if (userData[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(userData[field]);
        }
      });

      if (updates.length === 0) {
        return false;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const [result] = await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        throw new ApiError('User not found', 404);
      }

      // Fetch and return the updated user
      const [updatedUser] = await db.query(
        `SELECT 
          id,
          username,
          email,
          first_name,
          last_name,
          phone_number,
          bio,
          profile_image,
          is_admin,
          is_verified,
          is_active,
          created_at,
          updated_at,
          last_login
        FROM users 
        WHERE id = ?`,
        [id]
      );

      return updatedUser[0];
    } catch (error) {
      logger.error('Error updating user:', error);
      if (error instanceof ApiError) throw error;
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('username')) {
          throw new ApiError('Username already exists', 400);
        }
        if (error.message.includes('email')) {
          throw new ApiError('Email already exists', 400);
        }
      }
      throw new ApiError('Failed to update user', 500);
    }
  }

  static async verifyEmail(id) {
    try {
      const [result] = await db.query(
        'UPDATE users SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        throw new ApiError('User not found', 404);
      }
      
      return true;
    } catch (error) {
      logger.error('Error verifying email:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to verify email', 500);
    }
  }

  static async updatePassword(id, newPassword) {
    try {
      const [result] = await db.query(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPassword, id]
      );

      if (result.affectedRows === 0) {
        throw new ApiError('User not found', 404);
      }

      return true;
    } catch (error) {
      logger.error('Error updating password:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update password', 500);
    }
  }

  static async findById(id) {
    try {
      if (!id) {
        throw new ApiError('User ID is required', 400);
      }

      const [rows] = await db.query(
        `SELECT 
          id,
          username,
          email,
          first_name,
          last_name,
          phone_number,
          bio,
          profile_image,
          is_admin,
          is_verified,
          is_active,
          created_at,
          updated_at,
          last_login
        FROM users 
        WHERE id = ?`,
        [id]
      );

      if (!rows || rows.length === 0) {
        throw new ApiError('User not found', 404);
      }

      return rows[0];
    } catch (error) {
      logger.error(`Error finding user by ID ${id}:`, error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to find user', 500);
    }
  }

  static async updateActiveStatus(id, isActive) {
    try {
      const [result] = await db.query(
        'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isActive, id]
      );

      if (result.affectedRows === 0) {
        throw new ApiError('User not found', 404);
      }

      return true;
    } catch (error) {
      logger.error('Error updating user active status:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update user active status', 500);
    }
  }
}

module.exports = User;