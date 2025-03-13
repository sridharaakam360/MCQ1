const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');
const { 
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
} = require('../controllers/authController');

// Public routes
router.post('/signin', signIn);
router.post('/signup', signUp);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.post('/signout', protect, signOut);
router.put('/change-password', protect, changePassword);

module.exports = router;