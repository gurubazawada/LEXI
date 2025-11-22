import { Server, Socket } from 'socket.io';
import { queueService } from '../services/queue.service.js';
import { matchingService } from '../services/matching.service.js';
import { socketTrackingService } from '../services/socket-tracking.service.js';
import type { JoinQueuePayload, UserData } from '../types/index.js';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`✓ Client connected: ${socket.id}`);

    // Handle user joining queue
    socket.on('join_queue', async (payload: JoinQueuePayload) => {
      try {
        const { role, language, userId, username, walletAddress } = payload;

        // Validate payload
        if (!role || !language) {
          socket.emit('error', { message: 'Missing required fields: role and language' });
          return;
        }

        // Generate user ID if not provided (for anonymous users)
        const finalUserId = userId || `anon-${socket.id}`;
        const finalUsername = username || 'Anonymous';

        // Check if user already has an active match
        const hasMatch = await matchingService.hasActiveMatch(finalUserId);
        if (hasMatch) {
          const matchData = await matchingService.getMatch(finalUserId);
          if (matchData) {
            socket.emit('matched', {
              partner: matchData.partner,
              userId: finalUserId,
            });
            return;
          }
        }

        // Create user data object
        const userData: UserData = {
          id: finalUserId,
          username: finalUsername,
          walletAddress,
          role,
          language,
          timestamp: Date.now(),
          socketId: socket.id,
        };

        // Store user mapping for this socket
        socket.data.userId = finalUserId;
        socket.data.username = finalUsername;
        socket.data.role = role;
        socket.data.language = language;
        
        // Store socket ID in Redis for WebRTC signaling
        await socketTrackingService.setUserSocket(finalUserId, socket.id);

        // Try to find a match immediately
        const match = await matchingService.findMatch(userData);

        if (match) {
          // Match found! Notify both users
          socket.emit('matched', {
            partner: {
              id: match.id,
              username: match.username,
              walletAddress: match.walletAddress,
              language: match.language,
              role: match.role,
            },
            userId: finalUserId,
          });

          // Notify the matched partner
          io.to(match.socketId).emit('matched', {
            partner: {
              id: finalUserId,
              username: userData.username,
              walletAddress: userData.walletAddress,
              language: userData.language,
              role: userData.role,
            },
            userId: match.id,
          });

          console.log(`✓ Match completed: ${userData.username} ↔ ${match.username}`);
        } else {
          // No match found, add to queue
          await queueService.joinQueue(userData);
          
          // Get queue size and notify user
          const queueSize = await queueService.getQueueSize(role, language);
          socket.emit('queued', {
            message: 'Added to queue. Waiting for a partner...',
            queueSize,
            userId: finalUserId,
          });
        }
      } catch (error) {
        console.error('Error in join_queue:', error);
        socket.emit('error', { message: 'Failed to join queue' });
      }
    });

    // Handle user leaving queue
    socket.on('leave_queue', async () => {
      try {
        const { userId, role, language } = socket.data;

        if (!userId || !role || !language) {
          return;
        }

        // Remove from queue
        await queueService.leaveQueue(userId, role, language);
        
        // Remove match if exists
        await matchingService.removeMatch(userId);

        socket.emit('left_queue', { message: 'Successfully left the queue' });
        
        console.log(`User ${userId} left the queue`);
      } catch (error) {
        console.error('Error in leave_queue:', error);
        socket.emit('error', { message: 'Failed to leave queue' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        const { userId } = socket.data;

        if (userId) {
          // Remove user from all queues
          await queueService.removeUserFromAllQueues(userId);
          
          // Remove socket tracking
          await socketTrackingService.removeUserSocket(userId);
          
          console.log(`✗ Client disconnected: ${socket.id} (User: ${userId})`);
        } else {
          console.log(`✗ Client disconnected: ${socket.id}`);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Handle getting current queue status
    socket.on('get_queue_status', async (payload: { role: string; language: string }) => {
      try {
        const { role, language } = payload;
        
        if (!role || !language) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        const queueSize = await queueService.getQueueSize(role as 'learner' | 'fluent', language);
        
        socket.emit('queue_status', {
          queueSize,
          role,
          language,
        });
      } catch (error) {
        console.error('Error getting queue status:', error);
        socket.emit('error', { message: 'Failed to get queue status' });
      }
    });

    // ========== WebRTC Signaling Events ==========

    // Handle call initiation
    socket.on('call_initiate', async (payload: { partnerId: string }) => {
      try {
        const { partnerId } = payload;
        const { userId, username } = socket.data;

        if (!userId || !partnerId) {
          socket.emit('error', { message: 'Missing user or partner ID' });
          return;
        }

        // Get partner's socket ID
        const partnerSocketId = await socketTrackingService.getUserSocket(partnerId);
        
        if (!partnerSocketId) {
          socket.emit('error', { message: 'Partner not found or offline' });
          return;
        }

        // Notify partner of incoming call
        io.to(partnerSocketId).emit('call_incoming', {
          callerId: userId,
          callerName: username || 'Anonymous',
        });

        console.log(`📞 Call initiated: ${username} → Partner ${partnerId}`);
      } catch (error) {
        console.error('Error in call_initiate:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    // Handle call acceptance
    socket.on('call_accept', async (payload: { callerId: string }) => {
      try {
        const { callerId } = payload;
        const { userId } = socket.data;

        if (!userId || !callerId) {
          socket.emit('error', { message: 'Missing user or caller ID' });
          return;
        }

        // Get caller's socket ID
        const callerSocketId = await socketTrackingService.getUserSocket(callerId);
        
        if (!callerSocketId) {
          socket.emit('error', { message: 'Caller not found or offline' });
          return;
        }

        // Notify caller that call was accepted
        io.to(callerSocketId).emit('call_accepted', {
          calleeId: userId,
        });

        console.log(`✓ Call accepted: ${userId} accepted call from ${callerId}`);
      } catch (error) {
        console.error('Error in call_accept:', error);
        socket.emit('error', { message: 'Failed to accept call' });
      }
    });

    // Handle call rejection
    socket.on('call_reject', async (payload: { callerId: string }) => {
      try {
        const { callerId } = payload;
        const { userId } = socket.data;

        if (!callerId) {
          return;
        }

        // Get caller's socket ID
        const callerSocketId = await socketTrackingService.getUserSocket(callerId);
        
        if (callerSocketId) {
          io.to(callerSocketId).emit('call_rejected', {
            calleeId: userId,
          });
        }

        console.log(`✗ Call rejected: ${userId} rejected call from ${callerId}`);
      } catch (error) {
        console.error('Error in call_reject:', error);
      }
    });

    // Handle WebRTC offer
    socket.on('webrtc_offer', async (payload: { partnerId: string; offer: any }) => {
      try {
        const { partnerId, offer } = payload;
        const { userId } = socket.data;

        if (!partnerId || !offer) {
          socket.emit('error', { message: 'Missing partner ID or offer' });
          return;
        }

        // Get partner's socket ID
        const partnerSocketId = await socketTrackingService.getUserSocket(partnerId);
        
        if (!partnerSocketId) {
          socket.emit('error', { message: 'Partner not found' });
          return;
        }

        // Forward offer to partner
        io.to(partnerSocketId).emit('webrtc_offer', {
          offer,
          from: userId,
        });

        console.log(`📡 WebRTC offer sent: ${userId} → ${partnerId}`);
      } catch (error) {
        console.error('Error in webrtc_offer:', error);
        socket.emit('error', { message: 'Failed to send offer' });
      }
    });

    // Handle WebRTC answer
    socket.on('webrtc_answer', async (payload: { partnerId: string; answer: any }) => {
      try {
        const { partnerId, answer } = payload;
        const { userId } = socket.data;

        if (!partnerId || !answer) {
          socket.emit('error', { message: 'Missing partner ID or answer' });
          return;
        }

        // Get partner's socket ID
        const partnerSocketId = await socketTrackingService.getUserSocket(partnerId);
        
        if (!partnerSocketId) {
          socket.emit('error', { message: 'Partner not found' });
          return;
        }

        // Forward answer to partner
        io.to(partnerSocketId).emit('webrtc_answer', {
          answer,
          from: userId,
        });

        console.log(`📡 WebRTC answer sent: ${userId} → ${partnerId}`);
      } catch (error) {
        console.error('Error in webrtc_answer:', error);
        socket.emit('error', { message: 'Failed to send answer' });
      }
    });

    // Handle ICE candidate
    socket.on('ice_candidate', async (payload: { partnerId: string; candidate: any }) => {
      try {
        const { partnerId, candidate } = payload;
        const { userId } = socket.data;

        if (!partnerId || !candidate) {
          return;
        }

        // Get partner's socket ID
        const partnerSocketId = await socketTrackingService.getUserSocket(partnerId);
        
        if (!partnerSocketId) {
          return;
        }

        // Forward ICE candidate to partner
        io.to(partnerSocketId).emit('ice_candidate', {
          candidate,
          from: userId,
        });

        console.log(`🧊 ICE candidate sent: ${userId} → ${partnerId}`);
      } catch (error) {
        console.error('Error in ice_candidate:', error);
      }
    });

    // Handle call end
    socket.on('call_end', async (payload: { partnerId: string }) => {
      try {
        const { partnerId } = payload;
        const { userId } = socket.data;

        if (!partnerId) {
          return;
        }

        // Get partner's socket ID
        const partnerSocketId = await socketTrackingService.getUserSocket(partnerId);
        
        if (partnerSocketId) {
          io.to(partnerSocketId).emit('call_ended', {
            from: userId,
          });
        }

        console.log(`📴 Call ended: ${userId} ended call with ${partnerId}`);
      } catch (error) {
        console.error('Error in call_end:', error);
      }
    });
  });
}

