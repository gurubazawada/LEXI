import { redisClient } from '../config/redis.js';
import { queueService } from './queue.service.js';
import type { UserData, PartnerData, MatchData } from '../types/index.js';

export class MatchingService {
  private getMatchKey(userId: string): string {
    return `match:${userId}`;
  }

  /**
   * Attempt to find a match for the user
   * Returns the matched partner if found, null otherwise
   */
  async findMatch(userData: UserData): Promise<UserData | null> {
    const oppositeRole = userData.role === 'learner' ? 'fluent' : 'learner';
    
    // Try to get a user from the opposite queue
    const match = await queueService.getNextFromQueue(oppositeRole, userData.language);
    
    if (!match) {
      console.log(`No match found for ${userData.username}. Added to queue.`);
      return null;
    }
    
    console.log(`Match found! ${userData.username} (${userData.role}) ↔ ${match.username} (${match.role})`);
    
    // Store match data for both users with 5 minute expiration
    await this.storeMatch(userData.id, this.createPartnerData(match));
    await this.storeMatch(match.id, this.createPartnerData(userData));
    
    return match;
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
}

export const matchingService = new MatchingService();

