import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { CallState, CallIncomingPayload, CallAcceptedPayload, CallRejectedPayload, CallEndedPayload, WebRTCOfferPayload, WebRTCAnswerPayload, ICECandidatePayload } from '@/types/webrtc';

// STUN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC(partnerId: string | null, partnerName: string | null) {
  const { socket } = useSocket();
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCallerId, setIncomingCallerId] = useState<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize remote audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      remoteAudioRef.current = new Audio();
      remoteAudioRef.current.autoplay = true;
      remoteAudioRef.current.playsInline = true;
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up WebRTC resources');

    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.pause();
    }

    setCallDuration(0);
    setError(null);
  }, []);

  // Initialize peer connection
  const initializePeerConnection = useCallback(async () => {
    try {
      console.log('🔧 Initializing peer connection');

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && partnerId) {
          console.log('🧊 Sending ICE candidate');
          socket?.emit('ice_candidate', {
            partnerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle incoming tracks (remote audio)
      pc.ontrack = (event) => {
        console.log('🎵 Received remote audio track');
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          setCallState('active');
          startCallTimer();
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setError('Connection lost');
          endCall();
        }
      };

      // Request microphone access
      console.log('🎤 Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // Add local audio tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      return pc;
    } catch (err: any) {
      console.error('❌ Failed to initialize peer connection:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError('Failed to access microphone');
      }
      throw err;
    }
  }, [partnerId, socket]);

  // Start call timer
  const startCallTimer = useCallback(() => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // Start a call (caller)
  const startCall = useCallback(async () => {
    if (!partnerId || !socket) {
      console.error('Cannot start call: missing partner ID or socket');
      return;
    }

    try {
      setCallState('calling');
      setError(null);

      // Initialize peer connection and get mic access
      const pc = await initializePeerConnection();

      // Notify partner of incoming call
      socket.emit('call_initiate', { partnerId });

      console.log('📞 Call initiated to partner:', partnerId);
    } catch (err) {
      console.error('Failed to start call:', err);
      setCallState('idle');
      cleanup();
    }
  }, [partnerId, socket, initializePeerConnection, cleanup]);

  // Accept incoming call (callee)
  const acceptCall = useCallback(async () => {
    if (!incomingCallerId || !socket) {
      console.error('Cannot accept call: missing caller ID or socket');
      return;
    }

    try {
      setCallState('connecting');
      setError(null);

      // Initialize peer connection and get mic access
      await initializePeerConnection();

      // Notify caller that call was accepted
      socket.emit('call_accept', { callerId: incomingCallerId });

      console.log('✓ Call accepted from:', incomingCallerId);
    } catch (err) {
      console.error('Failed to accept call:', err);
      setCallState('idle');
      cleanup();
    }
  }, [incomingCallerId, socket, initializePeerConnection, cleanup]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!incomingCallerId || !socket) return;

    socket.emit('call_reject', { callerId: incomingCallerId });
    setCallState('idle');
    setIncomingCallerId(null);
    setIncomingCallerName(null);

    console.log('✗ Call rejected from:', incomingCallerId);
  }, [incomingCallerId, socket]);

  // End call
  const endCall = useCallback(() => {
    if (partnerId && socket && (callState === 'calling' || callState === 'connecting' || callState === 'active')) {
      socket.emit('call_end', { partnerId });
    }

    cleanup();
    setCallState('idle');
    setIncomingCallerId(null);
    setIncomingCallerName(null);

    console.log('📴 Call ended');
  }, [partnerId, socket, callState, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('🔇 Mute toggled:', !audioTrack.enabled);
      }
    }
  }, []);

  // Setup Socket.io event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle incoming call
    const handleCallIncoming = (data: CallIncomingPayload) => {
      console.log('📞 Incoming call from:', data.callerName);
      setIncomingCallerId(data.callerId);
      setIncomingCallerName(data.callerName);
      setCallState('incoming');
    };

    // Handle call accepted
    const handleCallAccepted = async (data: CallAcceptedPayload) => {
      console.log('✓ Call accepted by partner');
      setCallState('connecting');

      try {
        const pc = peerConnectionRef.current;
        if (!pc) {
          throw new Error('Peer connection not initialized');
        }

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('webrtc_offer', {
          partnerId,
          offer: pc.localDescription?.toJSON(),
        });

        console.log('📡 WebRTC offer sent');
      } catch (err) {
        console.error('Failed to create offer:', err);
        setError('Failed to establish connection');
        endCall();
      }
    };

    // Handle call rejected
    const handleCallRejected = (data: CallRejectedPayload) => {
      console.log('✗ Call rejected by partner');
      setError('Call was rejected');
      cleanup();
      setCallState('idle');
    };

    // Handle WebRTC offer
    const handleWebRTCOffer = async (data: WebRTCOfferPayload) => {
      console.log('📡 Received WebRTC offer');

      try {
        const pc = peerConnectionRef.current;
        if (!pc) {
          throw new Error('Peer connection not initialized');
        }

        // Set remote description
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc_answer', {
          partnerId: data.from,
          answer: pc.localDescription?.toJSON(),
        });

        console.log('📡 WebRTC answer sent');
      } catch (err) {
        console.error('Failed to handle offer:', err);
        setError('Failed to establish connection');
        endCall();
      }
    };

    // Handle WebRTC answer
    const handleWebRTCAnswer = async (data: WebRTCAnswerPayload) => {
      console.log('📡 Received WebRTC answer');

      try {
        const pc = peerConnectionRef.current;
        if (!pc) {
          throw new Error('Peer connection not initialized');
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('✓ Remote description set');
      } catch (err) {
        console.error('Failed to handle answer:', err);
        setError('Failed to establish connection');
        endCall();
      }
    };

    // Handle ICE candidate
    const handleICECandidate = async (data: ICECandidatePayload) => {
      console.log('🧊 Received ICE candidate');

      try {
        const pc = peerConnectionRef.current;
        if (!pc) {
          throw new Error('Peer connection not initialized');
        }

        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    };

    // Handle call ended
    const handleCallEnded = (data: CallEndedPayload) => {
      console.log('📴 Call ended by partner');
      cleanup();
      setCallState('idle');
      setIncomingCallerId(null);
      setIncomingCallerName(null);
    };

    // Register event listeners
    socket.on('call_incoming', handleCallIncoming);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('webrtc_offer', handleWebRTCOffer);
    socket.on('webrtc_answer', handleWebRTCAnswer);
    socket.on('ice_candidate', handleICECandidate);
    socket.on('call_ended', handleCallEnded);

    // Cleanup listeners
    return () => {
      socket.off('call_incoming', handleCallIncoming);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('webrtc_offer', handleWebRTCOffer);
      socket.off('webrtc_answer', handleWebRTCAnswer);
      socket.off('ice_candidate', handleICECandidate);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, partnerId, cleanup, endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    isMuted,
    callDuration,
    incomingCallerName,
    error,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}

