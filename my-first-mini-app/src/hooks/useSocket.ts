import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export interface PartnerData {
  username: string;
  walletAddress?: string;
  language: string;
  role: 'learner' | 'fluent';
}

export interface MatchedPayload {
  partner: PartnerData;
  userId: string;
}

export interface QueuedPayload {
  message: string;
  queueSize: number;
  userId: string;
}

export interface ErrorPayload {
  message: string;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✓ Connected to matching server');
      setIsConnected(true);
      setIsConnecting(false);
    });

    socket.on('disconnect', () => {
      console.log('✗ Disconnected from matching server');
      setIsConnected(false);
      setIsConnecting(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnecting(false);
    });

    // Connect the socket
    setIsConnecting(true);
    socket.connect();

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  const joinQueue = (payload: {
    role: 'learner' | 'fluent';
    language: string;
    userId?: string;
    username?: string;
    walletAddress?: string;
  }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_queue', payload);
    } else {
      console.error('Socket not connected');
    }
  };

  const leaveQueue = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_queue');
    }
  };

  const onMatched = (callback: (data: MatchedPayload) => void) => {
    socketRef.current?.on('matched', callback);
  };

  const onQueued = (callback: (data: QueuedPayload) => void) => {
    socketRef.current?.on('queued', callback);
  };

  const onError = (callback: (data: ErrorPayload) => void) => {
    socketRef.current?.on('error', callback);
  };

  const offMatched = (callback: (data: MatchedPayload) => void) => {
    socketRef.current?.off('matched', callback);
  };

  const offQueued = (callback: (data: QueuedPayload) => void) => {
    socketRef.current?.off('queued', callback);
  };

  const offError = (callback: (data: ErrorPayload) => void) => {
    socketRef.current?.off('error', callback);
  };

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    joinQueue,
    leaveQueue,
    onMatched,
    onQueued,
    onError,
    offMatched,
    offQueued,
    offError,
  };
}

