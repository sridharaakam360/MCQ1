const { Server } = require('socket.io');
const db = require('./config/db');

function setupWebSocket(server) {
  const io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10),
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '10000', 10),
    transports: ['websocket']
  });

  // Connection tracking
  const clients = new Map();

  // Middleware for connection tracking
  io.use((socket, next) => {
    clients.set(socket.id, {
      connectedAt: Date.now(),
      lastActivity: Date.now()
    });
    next();
  });

  // Clean up stale connections
  const cleanupInterval = setInterval(() => {
    const staleTimeout = parseInt(process.env.WS_STALE_TIMEOUT || '60000', 10);
    const now = Date.now();

    clients.forEach((data, socketId) => {
      if (now - data.lastActivity > staleTimeout) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          console.log(`Terminating stale connection: ${socketId}`);
          socket.disconnect(true);
        }
        clients.delete(socketId);
      }
    });
  }, parseInt(process.env.WS_STALE_CHECK_INTERVAL || '30000', 10));

  // Handle client connections
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Send initial connection success
    socket.emit('CONNECTION_SUCCESS', {
      status: 'connected',
      message: 'Successfully connected to WebSocket server',
      timestamp: Date.now()
    });

    // Update activity timestamp on any event
    socket.onAny(() => {
      if (clients.has(socket.id)) {
        clients.get(socket.id).lastActivity = Date.now();
      }
    });

    // Handle performance updates
    socket.on('UPDATE_PERFORMANCE', async (data) => {
      try {
        const [result] = await db.query(
          'UPDATE user_performance SET performance_metric = ? WHERE user_id = ?',
          [data.performanceMetric, data.userId]
        );

        if (result.affectedRows > 0) {
          io.emit('PERFORMANCE_UPDATED', {
            userId: data.userId,
            performanceMetric: data.performanceMetric,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error updating performance:', error);
        socket.emit('CONNECTION_ERROR', {
          message: 'Failed to update performance',
          timestamp: Date.now()
        });
      }
    });

    // Handle test status updates
    socket.on('UPDATE_TEST_STATUS', async (data) => {
      try {
        const [result] = await db.query(
          'UPDATE tests SET status = ? WHERE id = ?',
          [data.status, data.testId]
        );

        if (result.affectedRows > 0) {
          io.emit('TEST_STATUS_UPDATED', {
            testId: data.testId,
            status: data.status,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error updating test status:', error);
        socket.emit('CONNECTION_ERROR', {
          message: 'Failed to update test status',
          timestamp: Date.now()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      clients.delete(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
      clients.delete(socket.id);
    });
  });

  // Clean up on server close
  server.on('close', () => {
    clearInterval(cleanupInterval);
    io.close();
  });

  return io;
}

module.exports = setupWebSocket; 