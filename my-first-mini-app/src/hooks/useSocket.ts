import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

// Log the Socket.io URL for debugging
console.log('🔌 Socket.io Backend URL:', SOCKET_URL);

export interface PartnerData {
  id: string;
  username: string;
  walletAddress?: string;
  language: string;
  role: 'learner' | 'fluent';
}

export interface MatchedPayload {
  partner: PartnerData;
  userId: string;
  lessonId?: string;
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
      transports: ['websocket', 'polling'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✓ Connected to matching server:', SOCKET_URL);
      setIsConnected(true);
      setIsConnecting(false);
    });

    socket.on('disconnect', () => {
      console.log('✗ Disconnected from matching server:', SOCKET_URL);
      setIsConnected(false);
      setIsConnecting(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error to', SOCKET_URL, ':', error.message);
      setIsConnecting(false);
    });

    // Handle ping requests for responsiveness validation
    socket.on('ping', () => {
      // Immediately respond with pong to prove we're responsive
      socket.emit('pong');
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
    socketRef.current?.on('matched', (data: MatchedPayload, ackCallback?: (response: any) => void) => {
      // 1. Acknowledge receipt immediately if server requested it
      if (ackCallback) {
        ackCallback({ status: 'received' });
      }
      // 2. Call the user-provided callback
      callback(data);
    });
  };

  const onMatchCancelled = (callback: () => void) => {
    socketRef.current?.on('match_cancelled', callback);
  };

  const onQueued = (callback: (data: QueuedPayload) => void) => {
    socketRef.current?.on('queued', callback);
  };

  const onError = (callback: (data: ErrorPayload) => void) => {
    socketRef.current?.on('error', callback);
  };

  const offMatched = (callback: (data: MatchedPayload) => void) => {
    // Note: We need to match the exact function signature for removal,
    // but since we wrapped it, standard off might not work if we don't store the wrapper.
    // For now, 'off' will remove all listeners for 'matched' if we don't pass the wrapper.
    // A simpler way is to just remove all listeners for the event.
    socketRef.current?.removeAllListeners('matched');
  };

  const offMatchCancelled = (callback: () => void) => {
    socketRef.current?.off('match_cancelled', callback);
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
    onMatchCancelled,
    onQueued,
    onError,
    offMatched,
    offMatchCancelled,
    offQueued,
    offError,
  };
}

