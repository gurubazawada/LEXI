import { redisClient } from '../config/redis.js';
import { queueService } from './queue.service.js';
import { socketTrackingService } from './socket-tracking.service.js';
import type { UserData, PartnerData, MatchData } from '../types/index.js';

export class MatchingService {
  private getMatchKey(userId: string): string {
    return `match:${userId}`;
  }

  /**
   * Attempt to find a match for the user with atomic operations
   * Returns the matched partner if found, null otherwise
   * Validates socket connections and retries if partner is offline
   */
  async findMatch(userData: UserData, maxRetries: number = 5): Promise<UserData | null> {
    const oppositeRole = userData.role === 'learner' ? 'fluent' : 'learner';
    
    // Try up to maxRetries times to find a valid match
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Try to get a user from the opposite queue
      const match = await queueService.getNextFromQueue(oppositeRole, userData.language);
      
      if (!match) {
        console.log(`No match found for ${userData.username}. Added to queue.`);
        return null;
      }
      
      // CRITICAL: Validate that partner's socket still exists and is connected
      const partnerSocketId = await socketTrackingService.getUserSocket(match.id);
      
      if (!partnerSocketId) {
        console.log(`⚠️ Partner ${match.username} has no active socket. Skipping and trying next in queue (attempt ${attempt + 1}/${maxRetries})`);
        // Partner is offline, don't re-add to queue, just skip to next
        continue;
      }
      
      // Match is valid!
      console.log(`✓ Valid match found! ${userData.username} (${userData.role}) ↔ ${match.username} (${match.role})`);
      
      // Attach the validated socket ID to the match
      match.socketId = partnerSocketId;
      
      // Store match data for both users with 5 minute expiration
      await this.storeMatch(userData.id, this.createPartnerData(match));
      await this.storeMatch(match.id, this.createPartnerData(userData));
      
      return match;
    }
    
    // Exhausted all retries
    console.log(`No valid match found for ${userData.username} after ${maxRetries} attempts.`);
    return null;
  }

  /**
   * Store match data in Redis with TTL
   */
  private async storeMatch(userId: string, partner: PartnerData): Promise<void> {
    const matchKey = this.getMatchKey(userId);
    const matchData: MatchData = {
      partner,
      timestamp: Date.now(),
    };
    
    // Store as JSON string with 5 minute expiration
    await redisClient.setEx(matchKey, 300, JSON.stringify(matchData));
  }

  /**
   * Get match data for a user
   */
  async getMatch(userId: string): Promise<MatchData | null> {
    const matchKey = this.getMatchKey(userId);
    const matchJson = await redisClient.get(matchKey);
    
    if (!matchJson) {
      return null;
    }
    
    return JSON.parse(matchJson) as MatchData;
  }

  /**
   * Remove match data for a user
   */
  async removeMatch(userId: string): Promise<void> {
    const matchKey = this.getMatchKey(userId);
    await redisClient.del(matchKey);
    console.log(`Removed match for user ${userId}`);
  }

  /**
   * Create partner data object from user data
   */
  private createPartnerData(userData: UserData): PartnerData {
    return {
      id: userData.id,
      username: userData.username,
      walletAddress: userData.walletAddress,
      language: userData.language,
      role: userData.role,
    };
  }

  /**
   * Check if user already has an active match
   */
  async hasActiveMatch(userId: string): Promise<boolean> {
    const matchKey = this.getMatchKey(userId);
    const exists = await redisClient.exists(matchKey);
    return exists === 1;
  }

  /**
   * Rollback a failed match by re-adding both users to their queues
   * Used when match notification fails
   */
  async rollbackMatch(user1: UserData, user2: UserData): Promise<void> {
    console.log(`🔄 Rolling back failed match: ${user1.username} ↔ ${user2.username}`);
    
    try {
      // Remove match data for both users
      await this.removeMatch(user1.id);
      await this.removeMatch(user2.id);
      
      // Re-add both users to their respective queues
      await queueService.joinQueue(user1);
      await queueService.joinQueue(user2);
      
      console.log(`✓ Rollback complete: Both users re-added to queue`);
    } catch (error) {
      console.error('Error during match rollback:', error);
      throw error;
    }
  }
}

export const matchingService = new MatchingService();

