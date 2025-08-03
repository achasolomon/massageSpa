import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (path) => {
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    if (!path) return;

    // Create WebSocket connection
    const socketUrl = `${window.location.protocol === 'https:' ? 'wss://' : 'ws://'}${window.location.host}${path}`;
    ws.current = new WebSocket(socketUrl);

    ws.current.onopen = () => {
      // console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      setLastMessage(event);
    };

    ws.current.onclose = () => {
      // console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [path]);

  const sendMessage = (message) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { lastMessage, isConnected, sendMessage };
};