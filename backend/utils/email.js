const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../config/logger');

let transporter = null;

// Only create transporter if email configuration is provided
if (config.email.smtp.host && config.email.smtp.port && config.email.smtp.auth.user && config.email.smtp.auth.pass) {
  // Create reusable transporter object using SMTP transport
  transporter = nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.port === 465, // true for 465, false for other ports
    auth: {
      user: config.email.smtp.auth.user,
      pass: config.email.smtp.auth.pass,
    },
  });

  // Verify transporter connection only in production
  if (process.env.NODE_ENV === 'production') {
    transporter.verify()
      .then(() => {
        logger.info('SMTP connection established successfully');
      })
      .catch((error) => {
        logger.error('SMTP connection failed:', error);
      });
  } else {
    logger.info('Running in development mode - SMTP verification skipped');
  }
} else {
  logger.info('Email configuration not provided - email functionality disabled');
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text version of the email
 * @param {string} options.html - HTML version of the email
 */
const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    logger.info('Email not sent - email configuration not provided');
    return null;
  }

  try {
    const mailOptions = {
      from: config.email.from,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to,
      subject,
    });

    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send verification email
 * @param {string} to - Recipient email
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (to, token) => {
  if (!transporter) {
    logger.info('Verification email not sent - email configuration not provided');
    return null;
  }

  const subject = 'Email Verification - GPAT Prep';
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
  
  const text = `
    Welcome to GPAT Prep!
    
    Please verify your email address by clicking on the link below:
    ${verificationUrl}
    
    If you did not create an account, please ignore this email.
    
    Thanks,
    GPAT Prep Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to GPAT Prep!</h2>
      <p>Please verify your email address by clicking on the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #1976d2; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #1976d2;">${verificationUrl}</p>
      <p>If you did not create an account, please ignore this email.</p>
      <br>
      <p>Thanks,<br>GPAT Prep Team</p>
    </div>
  `;

  // In development, just log the verification URL
  if (process.env.NODE_ENV === 'development') {
    logger.info('Development verification URL:', verificationUrl);
    return;
  }

  return sendEmail({ to, subject, text, html });
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} token - Reset token
 */
const sendPasswordResetEmail = async (to, token) => {
  const subject = 'Password Reset - GPAT Prep';
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
  
  const text = `
    You have requested to reset your password.
    
    Please click the link below to reset your password:
    ${resetUrl}
    
    If you did not request this, please ignore this email.
    
    Thanks,
    GPAT Prep Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password. Click the button below to proceed:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #1976d2; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #1976d2;">${resetUrl}</p>
      <p>If you did not request this, please ignore this email.</p>
      <br>
      <p>Thanks,<br>GPAT Prep Team</p>
    </div>
  `;

  // In development, just log the reset URL
  if (process.env.NODE_ENV === 'development') {
    logger.info('Development password reset URL:', resetUrl);
    return;
  }

  return sendEmail({ to, subject, text, html });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
}; 