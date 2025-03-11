require('dotenv').config();
const { app, server } = require('./app');

const port = process.env.PORT || 5000;

// Add error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server with error handling
server.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
  console.log(`Server is running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database:', process.env.DB_NAME);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
}); 