import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import websocketService from '../services/websocket';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const messageQueue = useRef([]);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Base delay of 1 second

  const processMessageQueue = useCallback(() => {
    if (!isConnected || messageQueue.current.length === 0) return;

    while (messageQueue.current.length > 0) {
      const { type, data } = messageQueue.current[0];
      try {
        websocketService.emit(type, data);
        messageQueue.current.shift(); // Remove processed message
      } catch (error) {
        console.error('Failed to process queued message:', error);
        break;
      }
    }
  }, [isConnected]);

  const handleConnection = useCallback((data) => {
    setIsConnected(data.status === 'connected');
    setError(null);
    setReconnecting(false);
    setReconnectAttempt(0);
    processMessageQueue();
  }, [processMessageQueue]);

  const handleError = useCallback((error) => {
    setError(error.message);
    setIsConnected(false);
  }, []);

  const handleReconnecting = useCallback(() => {
    setReconnecting(true);
    setReconnectAttempt(prev => prev + 1);
  }, []);

  const calculateReconnectDelay = useCallback(() => {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      reconnectDelay * Math.pow(2, reconnectAttempt),
      30000 // Max delay of 30 seconds
    );
    // Add random jitter between 0-1000ms
    return exponentialDelay + Math.random() * 1000;
  }, [reconnectAttempt]);

  useEffect(() => {
    let reconnectTimer;

    const attemptReconnection = async () => {
      if (reconnectAttempt >= maxReconnectAttempts) {
        setError('Maximum reconnection attempts reached. Please refresh the page.');
        setReconnecting(false);
        return;
      }

      if (!isConnected && !reconnecting) {
        setReconnecting(true);
        const delay = calculateReconnectDelay();
        reconnectTimer = setTimeout(() => {
          websocketService.connect();
        }, delay);
      }
    };

    if (!isConnected && !error) {
      attemptReconnection();
    }

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [isConnected, reconnecting, reconnectAttempt, error, calculateReconnectDelay]);

  useEffect(() => {
    // Initial connection
    websocketService.connect();

    // Set up event listeners
    const connectionSub = websocketService.on('CONNECTION_SUCCESS', handleConnection);
    const errorSub = websocketService.on('CONNECTION_ERROR', handleError);
    const reconnectingSub = websocketService.on('RECONNECTING', handleReconnecting);

    // Cleanup on unmount
    return () => {
      connectionSub();
      errorSub();
      reconnectingSub();
      websocketService.disconnect();
    };
  }, [handleConnection, handleError, handleReconnecting]);

  const retryConnection = useCallback(() => {
    if (reconnectAttempt >= maxReconnectAttempts) {
      setReconnectAttempt(0);
    }
    setError(null);
    websocketService.connect();
  }, [reconnectAttempt]);

  const emit = useCallback((type, data) => {
    if (!isConnected) {
      // Queue message if not connected
      messageQueue.current.push({ type, data });
      if (!reconnecting) {
        console.warn('WebSocket is not connected. Message queued. Attempting to reconnect...');
        retryConnection();
      }
      return;
    }

    try {
      websocketService.emit(type, data);
    } catch (error) {
      console.error('Failed to emit message:', error);
      messageQueue.current.push({ type, data });
      throw error;
    }
  }, [isConnected, reconnecting, retryConnection]);

  const on = useCallback((type, callback) => {
    return websocketService.on(type, callback);
  }, []);

  const off = useCallback((type, callback) => {
    websocketService.off(type, callback);
  }, []);

  const clearMessageQueue = useCallback(() => {
    messageQueue.current = [];
  }, []);

  const value = {
    isConnected,
    error,
    reconnecting,
    reconnectAttempt,
    queueLength: messageQueue.current.length,
    emit,
    on,
    off,
    retryConnection,
    clearMessageQueue
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}; 