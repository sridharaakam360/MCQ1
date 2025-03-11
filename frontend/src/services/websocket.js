import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.messageQueue = [];
    this.maxReconnectAttempts = 5;
    this.reconnectAttempts = 0;
    this.reconnectInterval = 5000;
    this.isConnecting = false;
    this.forceClosed = false;
    this.pingInterval = null;
    this.lastPingTime = null;
  }

  async connect() {
    if (this.socket || this.isConnecting || this.forceClosed) return;

    try {
      this.isConnecting = true;
      const SOCKET_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
      
      // Create Socket.IO instance with configuration
      this.socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
        timeout: 10000,
        autoConnect: false,
        transports: ['websocket']
      });

      // Setup event handlers
      this.socket.on('connect', this.handleOpen.bind(this));
      this.socket.on('disconnect', this.handleClose.bind(this));
      this.socket.on('connect_error', this.handleError.bind(this));
      this.socket.on('error', this.handleError.bind(this));
      this.socket.on('reconnect_attempt', () => {
        this.reconnectAttempts++;
        this.handleReconnecting();
      });
      this.socket.on('reconnect_failed', () => {
        this.handleReconnectFailed();
      });

      // Connect to the server
      this.socket.connect();

      // Start ping interval
      this.startPing();

    } catch (error) {
      console.error('Socket.IO connection error:', error);
      this.handleError(error);
    } finally {
      this.isConnecting = false;
    }
  }

  startPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.ping();
      }
    }, 30000);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  ping() {
    this.lastPingTime = Date.now();
    this.socket.emit('ping');
  }

  handleOpen() {
    console.log('Socket.IO connection established');
    this.reconnectAttempts = 0;
    this.forceClosed = false;
    this.emit('connection', { status: 'connected' });
    
    // Process queued messages
    while (this.messageQueue.length > 0) {
      const { type, data } = this.messageQueue.shift();
      this.emit(type, data);
    }
  }

  handleClose(reason) {
    this.stopPing();
    console.log(`Socket.IO connection closed: ${reason}`);
    
    if (this.socket) {
      this.socket.off();
      this.socket = null;
    }

    // Don't attempt to reconnect if explicitly closed
    if (reason === 'io client disconnect' || this.forceClosed) {
      return;
    }

    this.attemptReconnect();
  }

  handleError(error) {
    console.error('Socket.IO error:', error);
    this.notifyError(error.message || 'Connection error occurred');
  }

  handleReconnecting() {
    const event = {
      type: 'RECONNECTING',
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    };
    this.handleMessageData(event);
  }

  handleReconnectFailed() {
    this.forceClosed = true;
    this.notifyError('Maximum reconnection attempts reached. Please refresh the page.');
  }

  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.forceClosed) {
      this.handleReconnectFailed();
      return;
    }

    if (!this.socket?.connected && !this.isConnecting) {
      await this.connect();
    }
  }

  notifyError(message) {
    const errorEvent = {
      type: 'CONNECTION_ERROR',
      message,
      timestamp: Date.now()
    };
    this.handleMessageData(errorEvent);
  }

  handleMessageData(data) {
    const listeners = this.listeners.get(data.type) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in listener for event ${data.type}:`, error);
      }
    });
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);

    // If it's a Socket.IO event, also register it with the socket
    if (this.socket) {
      this.socket.on(type, callback);
    }

    return () => this.off(type, callback);
  }

  off(type, callback) {
    if (!this.listeners.has(type)) return;
    
    const listeners = this.listeners.get(type);
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    // Remove from Socket.IO events as well
    if (this.socket) {
      this.socket.off(type, callback);
    }
  }

  emit(type, data) {
    const message = { ...data, timestamp: Date.now() };

    if (!this.socket?.connected) {
      this.messageQueue.push({ type, data: message });
      if (!this.socket && !this.isConnecting && !this.forceClosed) {
        this.connect();
      }
      return;
    }

    try {
      this.socket.emit(type, message);
    } catch (error) {
      console.error('Error sending message:', error);
      this.messageQueue.push({ type, data: message });
      this.handleError(error);
    }
  }

  disconnect() {
    this.forceClosed = true;
    this.stopPing();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.messageQueue = [];
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();
export default websocketService; 