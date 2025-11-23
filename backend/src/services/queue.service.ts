import { redisClient } from '../config/redis.js';
import type { UserData } from '../types/index.js';

export class QueueService {
  private getQueueKey(role: 'learner' | 'fluent', language: string): string {
    return `queue:${role}:${language}`;
  }

  private getUserQueueKey(userId: string): string {
    return `user:queue:${userId}`;
  }

  /**
   * Add user to the appropriate queue
   * Enforces single-queue membership by removing from any previous queue first
   */
  async joinQueue(userData: UserData): Promise<void> {
    // 1. Check if user is already in a queue and remove them if so
    await this.removeUserFromAnyQueue(userData.id);

    const queueKey = this.getQueueKey(userData.role, userData.language);
    const userQueueKey = this.getUserQueueKey(userData.id);
    
    // Remove socketId before storing to prevent stale socket IDs
    const { socketId, ...userDataWithoutSocket } = userData;
    const userJson = JSON.stringify(userDataWithoutSocket);
    
    // 2. Add to queue (left push - FIFO with right pop)
    await redisClient.lPush(queueKey, userJson);
    
    // 3. Track active user and their specific queue location
    await redisClient.sAdd('active_users', userData.id);
    await redisClient.set(userQueueKey, `${userData.role}:${userData.language}`);
    
    console.log(`User ${userData.username} (${userData.id}) joined ${userData.role} queue for ${userData.language}`);
  }

  /**
   * Remove user from specific queue
   */
  async leaveQueue(userId: string, role: 'learner' | 'fluent', language: string): Promise<void> {
    const queueKey = this.getQueueKey(role, language);
    const userQueueKey = this.getUserQueueKey(userId);
    
    // Get all items in queue
    const queueItems = await redisClient.lRange(queueKey, 0, -1);
    
    // Find and remove the user
    for (const item of queueItems) {
      const user = JSON.parse(item) as UserData;
      if (user.id === userId) {
        await redisClient.lRem(queueKey, 1, item);
        console.log(`User ${userId} left ${role} queue for ${language}`);
        break;
      }
    }
    
    // Remove tracking
    await redisClient.sRem('active_users', userId);
    await redisClient.del(userQueueKey);
  }

  /**
   * Remove user from ANY queue they might be in
   * Uses direct lookup for O(1) performance instead of scanning all queues
   */
  async removeUserFromAnyQueue(userId: string): Promise<void> {
    const userQueueKey = this.getUserQueueKey(userId);
    const queueInfo = await redisClient.get(userQueueKey);
    
    if (queueInfo) {
      const [role, language] = queueInfo.split(':') as ['learner' | 'fluent', string];
      if (role && language) {
        console.log(`Removing user ${userId} from previous queue: ${role}:${language}`);
        await this.leaveQueue(userId, role, language);
        return;
      }
    }
    
    // Fallback: Check active_users just in case, though the mapping should be the source of truth
    const isActive = await redisClient.sIsMember('active_users', userId);
    if (isActive) {
        // If in active_users but no mapping, clean up active_users
        await redisClient.sRem('active_users', userId);
    }
  }

  // Deprecated alias for compatibility, but uses new efficient logic
  async removeUserFromAllQueues(userId: string): Promise<void> {
    await this.removeUserFromAnyQueue(userId);
  }

  /**
   * Get queue size for a specific role and language
   */
  async getQueueSize(role: 'learner' | 'fluent', language: string): Promise<number> {
    const queueKey = this.getQueueKey(role, language);
    return await redisClient.lLen(queueKey);
  }

  /**
   * Get the next user from the opposite queue (for matching)
   */
  async getNextFromQueue(role: 'learner' | 'fluent', language: string): Promise<UserData | null> {
    const queueKey = this.getQueueKey(role, language);
    
    // Pop from right (FIFO)
    const userJson = await redisClient.rPop(queueKey);
    
    if (!userJson) {
      return null;
    }
    
    const userData = JSON.parse(userJson) as UserData;
    
    // Remove from active users and tracking since they're no longer in queue (they're matched)
    await redisClient.sRem('active_users', userData.id);
    await redisClient.del(this.getUserQueueKey(userData.id));
    
    return userData;
  }

  /**
   * Check if user is in any queue
   */
  async isUserInQueue(userId: string): Promise<boolean> {
    return await redisClient.sIsMember('active_users', userId);
  }
}

export const queueService = new QueueService();

