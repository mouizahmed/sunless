"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SSENotification } from '@/lib/api';

interface UseSSEOptions {
  onUrlExtractionUpdate?: (notification: SSENotification) => void;
  onTranscriptionUpdate?: (notification: SSENotification) => void;
  onConnection?: () => void;
  onDisconnection?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

interface UseSSEReturn {
  isConnected: boolean;
  lastNotification: SSENotification | null;
  reconnect: () => void;
  disconnect: () => void;
  connectionCount: number;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const { getToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<SSENotification | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const {
    onUrlExtractionUpdate,
    onTranscriptionUpdate,
    onConnection,
    onDisconnection,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000
  } = options;

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || !mountedRef.current) return;

      // Close existing connection
      disconnect();

      // Create SSE connection with token as query parameter
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const url = `${API_BASE_URL}/events/stream?token=${encodeURIComponent(token)}`;
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setConnectionCount(prev => prev + 1);
        onConnection?.();
        console.log('SSE connection established');
      };

      eventSource.onerror = (error) => {
        if (!mountedRef.current) return;
        console.error('SSE connection error:', error);
        setIsConnected(false);
        onError?.(error);

        // Auto-reconnect if enabled
        if (autoReconnect && eventSource.readyState === EventSource.CLOSED) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log('Attempting to reconnect SSE...');
              connect();
            }
          }, reconnectInterval);
        }
      };

      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const notification: SSENotification = JSON.parse(event.data);
          setLastNotification(notification);
          
          // Route notifications based on type
          switch (notification.type) {
            case 'url_extraction_update':
              onUrlExtractionUpdate?.(notification);
              break;
            case 'transcription_update':
              onTranscriptionUpdate?.(notification);
              break;
            case 'connection':
              // Connection established
              break;
            case 'heartbeat':
              // Keep-alive heartbeat
              break;
            default:
              console.log('Unknown notification type:', notification.type);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      // Handle specific event types
      eventSource.addEventListener('url_extraction_update', (event) => {
        if (!mountedRef.current) return;
        try {
          const notification: SSENotification = JSON.parse(event.data);
          setLastNotification(notification);
          onUrlExtractionUpdate?.(notification);
        } catch (error) {
          console.error('Error parsing URL extraction update:', error);
        }
      });

      eventSource.addEventListener('transcription_update', (event) => {
        if (!mountedRef.current) return;
        try {
          const notification: SSENotification = JSON.parse(event.data);
          setLastNotification(notification);
          onTranscriptionUpdate?.(notification);
        } catch (error) {
          console.error('Error parsing transcription update:', error);
        }
      });

      eventSource.addEventListener('heartbeat', () => {
        // Keep connection alive
        console.debug('SSE heartbeat received');
      });

    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      setIsConnected(false);
    }
  }, [getToken, disconnect, onConnection, onError, onUrlExtractionUpdate, onTranscriptionUpdate, autoReconnect, reconnectInterval]);

  const reconnect = useCallback(() => {
    console.log('Manual SSE reconnection requested');
    connect();
  }, [connect]);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (onDisconnection) {
        onDisconnection();
      }
    };
  }, [onDisconnection]);

  return {
    isConnected,
    lastNotification,
    reconnect,
    disconnect,
    connectionCount
  };
}
