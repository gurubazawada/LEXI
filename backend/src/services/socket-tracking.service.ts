import { redisClient } from '../config/redis.js';
import type { Server } from 'socket.io';

export class SocketTrackingService {
  private getSocketKey(userId: string): string {
    return `user_socket:${userId}`;
  }

  /**
   * Store user's socket ID in Redis
   */
  async setUserSocket(userId: string, socketId: string): Promise<void> {
    const key = this.getSocketKey(userId);
    // Store with 1 hour expiration
    await redisClient.setEx(key, 3600, socketId);
    console.log(`Stored socket mapping: ${userId} → ${socketId}`);
  }

  /**
   * Get user's socket ID from Redis
   */
  async getUserSocket(userId: string): Promise<string | null> {
    const key = this.getSocketKey(userId);
    return await redisClient.get(key);
  }

  /**
   * Remove user's socket ID from Redis
   */
  async removeUserSocket(userId: string): Promise<void> {
    const key = this.getSocketKey(userId);
    await redisClient.del(key);
    console.log(`Removed socket mapping for user: ${userId}`);
  }

  /**
   * Update socket ID for a user (refresh TTL)
   */
  async refreshUserSocket(userId: string): Promise<void> {
    const key = this.getSocketKey(userId);
    await redisClient.expire(key, 3600);
  }

  /**
   * Ping a user to verify they are responsive
   * Returns true if user responds within timeout, false otherwise
   */
  async pingUser(io: Server, socketId: string, timeoutMs: number = 2000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = io.sockets.sockets.get(socketId);
      
      if (!socket) {
        resolve(false);
        return;
      }
      
      let responded = false;
      const timeout = setTimeout(() => {
        if (!responded) {
          socket.off('pong', pongHandler);
          resolve(false);
        }
      }, timeoutMs);
      
      const pongHandler = () => {
        responded = true;
        clearTimeout(timeout);
        resolve(true);
      };
      
      socket.once('pong', pongHandler);
      socket.emit('ping');
    });
  }
}

export const socketTrackingService = new SocketTrackingService();

