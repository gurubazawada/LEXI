import { redisClient } from '../config/redis.js';

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
}

export const socketTrackingService = new SocketTrackingService();

