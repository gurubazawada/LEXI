import { redisClient } from '../config/redis.js';
import type { UserData } from '../types/index.js';

export class QueueService {
  private getQueueKey(role: 'learner' | 'fluent', language: string): string {
    return `queue:${role}:${language}`;
  }

  /**
   * Add user to the appropriate queue
   */
  async joinQueue(userData: UserData): Promise<void> {
    const queueKey = this.getQueueKey(userData.role, userData.language);
    const userJson = JSON.stringify(userData);
    
    // Add to queue (left push - FIFO with right pop)
    await redisClient.lPush(queueKey, userJson);
    
    // Track active user
    await redisClient.sAdd('active_users', userData.id);
    
    console.log(`User ${userData.username} (${userData.id}) joined ${userData.role} queue for ${userData.language}`);
  }

  /**
   * Remove user from queue
   */
  async leaveQueue(userId: string, role: 'learner' | 'fluent', language: string): Promise<void> {
    const queueKey = this.getQueueKey(role, language);
    
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
    
    // Remove from active users
    await redisClient.sRem('active_users', userId);
  }

  /**
   * Remove user from all queues (when they disconnect)
   */
  async removeUserFromAllQueues(userId: string): Promise<void> {
    const languages = ['es', 'en', 'fr', 'jp', 'de', 'pt', 'it', 'zh'];
    const roles: ('learner' | 'fluent')[] = ['learner', 'fluent'];
    
    for (const role of roles) {
      for (const language of languages) {
        const queueKey = this.getQueueKey(role, language);
        const queueItems = await redisClient.lRange(queueKey, 0, -1);
        
        for (const item of queueItems) {
          const user = JSON.parse(item) as UserData;
          if (user.id === userId) {
            await redisClient.lRem(queueKey, 1, item);
            console.log(`Removed disconnected user ${userId} from ${role}:${language} queue`);
          }
        }
      }
    }
    
    // Remove from active users
    await redisClient.sRem('active_users', userId);
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
    
    // Remove from active users since they're no longer in queue (they're matched)
    await redisClient.sRem('active_users', userData.id);
    
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

