import { Server, Socket } from 'socket.io';
import { queueService } from '../services/queue.service.js';
import { matchingService } from '../services/matching.service.js';
import { socketTrackingService } from '../services/socket-tracking.service.js';
import { lessonService } from '../services/lesson.service.js';
import type { JoinQueuePayload, UserData } from '../types/index.js';

// Store disconnect timers for grace period
const disconnectTimers = new Map<string, NodeJS.Timeout>();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`✓ Client connected: ${socket.id}`);
    
    // Check if this is a reconnection - cancel any pending disconnect timer
    const existingUserId = socket.handshake.auth?.userId;
    if (existingUserId && disconnectTimers.has(existingUserId)) {
      clearTimeout(disconnectTimers.get(existingUserId)!);
      disconnectTimers.delete(existingUserId);
      console.log(`✓ Reconnection detected for user ${existingUserId} - grace period cancelled`);
    }

    // Handle ping-pong for responsiveness validation
    socket.on('pong', () => {
      // Client responded to ping - they're alive and responsive
      socket.data.lastPong = Date.now();
    });

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
        
        // Cancel any pending disconnect timer for this user (reconnection case)
        if (disconnectTimers.has(finalUserId)) {
          clearTimeout(disconnectTimers.get(finalUserId)!);
          disconnectTimers.delete(finalUserId);
          console.log(`✓ User ${finalUserId} reconnected - keeping queue position`);
        }

        // Note: queueService.joinQueue automatically removes user from any previous queue
        // so we don't need manual cleanup here anymore.
        
        // Try to find a match immediately (with socket validation, ping validation, and retries)
        const match = await matchingService.findMatch(userData, io);

        if (match) {
          // Match found! 
          // The matched user is already removed from queue and active_users by getNextFromQueue
          
          // For the current user (finalUserId):
          // If they were just added to queue by matchingService.rollbackMatch (in a failed match scenario),
          // they would be in the queue. But here, we haven't added them to queue yet.
          // We only add to queue if NO match is found (in the else block).
          
          // However, if findMatch fails, we add them to queue.
          // The logic flow is: 
          // 1. User connects.
          // 2. findMatch checks OPPOSITE queue.
          // 3. If match, user is paired. User is NEVER added to queue.
          // 4. If no match, user is added to queue.
          
          // So we don't need to "leaveQueue" for the current user because they aren't in it yet!
          // UNLESS they were in a queue from a previous session (handled by removeUserFromAnyQueue inside joinQueue if we called it).
          
          // Wait, we only call joinQueue in the 'else' block.
          // So if a user WAS in a queue (e.g. waiting for Spanish), and now joins for French:
          // 1. findMatch looks for French partner.
          // 2. If found -> Match! 
          // BUT User is still in Spanish queue in Redis!
          // We MUST ensure they are removed from Spanish queue even if they match immediately in French.
          
          // FIX: Explicitly ensure user is removed from any previous queue
          await queueService.removeUserFromAnyQueue(finalUserId);
          
          // CRITICAL: Validate that partner socket still exists (double-check)
          const partnerSocket = io.sockets.sockets.get(match.socketId!);
          if (!partnerSocket) {
            console.error(`⚠️ Partner socket ${match.socketId} not found after match! Rolling back...`);
            // Rollback the match
            await matchingService.rollbackMatch(userData, match);
            socket.emit('error', { message: 'Match failed - partner disconnected. Please try again.' });
            return;
          }
          
          // Create a lesson for this match
          let lessonId: string | undefined;
          try {
            const learnerId = role === 'learner' ? finalUserId : match.id;
            const learnerUsername = role === 'learner' ? userData.username : match.username;
            const learnerWalletAddress = role === 'learner' ? userData.walletAddress : match.walletAddress;
            const fluentId = role === 'fluent' ? finalUserId : match.id;
            const fluentUsername = role === 'fluent' ? userData.username : match.username;
            const fluentWalletAddress = role === 'fluent' ? userData.walletAddress : match.walletAddress;

            const lesson = await lessonService.createLesson(
              learnerId,
              learnerUsername,
              learnerWalletAddress,
              fluentId,
              fluentUsername,
              fluentWalletAddress,
              language
            );
            lessonId = lesson.id;

            // Store lesson ID in socket data for later reference
            socket.data.lessonId = lessonId;
            socket.data.partnerId = match.id;
          } catch (error) {
            console.error('Error creating lesson:', error);
            // Continue even if lesson creation fails
          }
          
          // Wrap match notification in try-catch for rollback on failure
          try {
            // Prepare payloads
            const userPayload = {
              partner: {
                id: match.id,
                username: match.username,
                walletAddress: match.walletAddress,
                language: match.language,
                role: match.role,
              },
              userId: finalUserId,
              lessonId,
            };

            const partnerPayload = {
              partner: {
                id: finalUserId,
                username: userData.username,
                walletAddress: userData.walletAddress,
                language: userData.language,
                role: userData.role,
              },
              userId: match.id,
              lessonId,
            };

            // Store lesson ID in partner socket data
            partnerSocket.data.lessonId = lessonId;
            partnerSocket.data.partnerId = finalUserId;

            // Emit 'matched' event to both users with a 5-second timeout and wait for acknowledgment
            // This ensures both users actually received the event before we consider it a success
            console.log(`⏳ Sending match notifications with ACK required...`);
            
            await Promise.all([
              socket.timeout(5000).emitWithAck('matched', userPayload),
              partnerSocket.timeout(5000).emitWithAck('matched', partnerPayload)
            ]);

            console.log(`✓ Match completed & confirmed: ${userData.username} ↔ ${match.username}${lessonId ? ` (Lesson: ${lessonId})` : ''}`);
          } catch (notificationError) {
            console.error('⚠️ Match delivery failed (ACK timeout or error). Rolling back...', notificationError);
            
            // 1. Rollback the match in Redis
            await matchingService.rollbackMatch(userData, match);
            
            // 2. Notify both users that match is cancelled (in case one received it)
            socket.emit('match_cancelled');
            if (partnerSocket) {
              partnerSocket.emit('match_cancelled');
            }
            
            // 3. Send error message
            socket.emit('error', { message: 'Match failed (network timeout). Please try again.' });
            if (partnerSocket) {
              partnerSocket.emit('error', { message: 'Match failed (network timeout). Please try again.' });
            }
          }
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

    // Handle disconnection with grace period
    socket.on('disconnect', async () => {
      try {
        const { userId, role, language } = socket.data;

        if (userId) {
          console.log(`⏳ Client disconnected: ${socket.id} (User: ${userId}) - starting 10s grace period`);
          
          // Set a 10-second grace period before removing from queue
          const timer = setTimeout(async () => {
            try {
              // Check if user is still in queue (they might have been matched during grace period)
              const isInQueue = await queueService.isUserInQueue(userId);
              
              if (isInQueue) {
                // Remove user from any queue they are in
                await queueService.removeUserFromAnyQueue(userId);
                console.log(`✗ Grace period expired: Removed ${userId} from queue`);
              }
              
              // Remove socket tracking
              await socketTrackingService.removeUserSocket(userId);
              
              // Clean up timer
              disconnectTimers.delete(userId);
            } catch (error) {
              console.error('Error in disconnect grace period cleanup:', error);
            }
          }, 10000); // 10 second grace period
          
          // Store the timer so it can be cancelled on reconnection
          disconnectTimers.set(userId, timer);
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
        const { userId, lessonId } = socket.data;

        if (!partnerId) {
          return;
        }

        // End the lesson if it exists
        if (lessonId) {
          try {
            await lessonService.endLesson(lessonId);
            console.log(`✓ Lesson ended: ${lessonId}`);
          } catch (error) {
            console.error('Error ending lesson:', error);
          }
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

