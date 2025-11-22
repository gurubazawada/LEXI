import { Server, Socket } from 'socket.io';
import { queueService } from '../services/queue.service.js';
import { matchingService } from '../services/matching.service.js';
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
        socket.data.role = role;
        socket.data.language = language;

        // Try to find a match immediately
        const match = await matchingService.findMatch(userData);

        if (match) {
          // Match found! Notify both users
          socket.emit('matched', {
            partner: {
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
  });
}

