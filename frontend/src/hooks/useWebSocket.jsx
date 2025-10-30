import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    try {
      console.log('Attempting to connect to WebSocket:', url);
      setConnectionStatus('connecting');

      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;

        // Отправляем ping каждые 30 секунд для поддержания соединения
        const pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        ws.current.pingInterval = pingInterval;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 WebSocket message received:', data.type);
          setLastMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('disconnected');
      };

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected, code:', event.code);
        setIsConnected(false);
        setConnectionStatus('disconnected');

        // Очищаем ping interval
        if (ws.current?.pingInterval) {
          clearInterval(ws.current.pingInterval);
        }

        // Переподключение с exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

          setConnectionStatus('reconnecting');
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          setConnectionStatus('disconnected');
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('disconnected');
    }
  }, [url]);


  useEffect(() => {
    connect();

    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current?.pingInterval) {
        clearInterval(ws.current.pingInterval);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
      return false;
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connectionStatus
  };
};