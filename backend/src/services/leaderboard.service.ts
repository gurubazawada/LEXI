import { redisClient } from '../config/redis.js';
import { reviewService } from './review.service.js';
import { lessonService } from './lesson.service.js';

export interface LeaderboardEntry {
  fluentId: string;
  fluentUsername: string;
  fluentWalletAddress?: string;
  averageRating: number;
  totalReviews: number;
  totalSessions: number;
  rank: number;
}

export class LeaderboardService {
  /**
   * Get all fluent speakers who have lessons
   */
  private async getAllFluentSpeakers(): Promise<Set<string>> {
    const fluentSpeakers = new Set<string>();
    
    try {
      // Get all lesson keys
      const lessonKeys = await redisClient.keys('lesson:*');
      console.log(`Found ${lessonKeys.length} lesson keys`);
      
      for (const key of lessonKeys) {
        // Skip review keys
        if (key.includes(':reviews')) {
          continue;
        }
        
        try {
          const lessonJson = await redisClient.get(key);
          if (lessonJson) {
            try {
              const lesson = JSON.parse(lessonJson);
              if (lesson.fluentId) {
                fluentSpeakers.add(lesson.fluentId);
              }
            } catch (error) {
              console.error(`Error parsing lesson from key ${key}:`, error);
            }
          }
        } catch (error) {
          console.error(`Error getting lesson from key ${key}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in getAllFluentSpeakers:', error);
      throw error;
    }
    
    console.log(`Found ${fluentSpeakers.size} unique fluent speakers`);
    return fluentSpeakers;
  }

  /**
   * Get leaderboard entries for all fluent speakers
   * Sorted by: 1) Average rating (desc), 2) Total sessions (desc), 3) Alphabetical (asc)
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      console.log('Starting leaderboard calculation...');
      const fluentSpeakers = await this.getAllFluentSpeakers();
      const entries: LeaderboardEntry[] = [];

      if (fluentSpeakers.size === 0) {
        console.log('No fluent speakers found in lessons - returning empty leaderboard');
        return [];
      }

      console.log(`Processing ${fluentSpeakers.size} fluent speakers...`);

      // Get data for each fluent speaker
      for (const fluentId of fluentSpeakers) {
        try {
          // Get rating data
          const rating = await reviewService.getFluentRating(fluentId);
          
          // Get total sessions count
          const lessons = await lessonService.getUserLessons(fluentId, 10000);
          const totalSessions = lessons.length;

          // Get fluent username from first lesson (or use a default)
          let fluentUsername = 'Unknown';
          let fluentWalletAddress: string | undefined;
          
          if (lessons.length > 0) {
            fluentUsername = lessons[0].fluentUsername;
            fluentWalletAddress = lessons[0].fluentWalletAddress;
          }

          // Only include fluent speakers who have at least one review
          if (rating.totalReviews > 0) {
            entries.push({
              fluentId,
              fluentUsername,
              fluentWalletAddress,
              averageRating: rating.averageRating,
              totalReviews: rating.totalReviews,
              totalSessions,
              rank: 0, // Will be set after sorting
            });
          }
        } catch (error) {
          console.error(`Error processing fluent speaker ${fluentId}:`, error);
          // Continue processing other speakers even if one fails
        }
      }

      // Sort by: 1) Average rating (desc), 2) Total sessions (desc), 3) Alphabetical (asc)
      entries.sort((a, b) => {
        // First: Compare by average rating (descending)
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        
        // Second: Compare by total sessions (descending)
        if (b.totalSessions !== a.totalSessions) {
          return b.totalSessions - a.totalSessions;
        }
        
        // Third: Compare alphabetically by username (ascending)
        return a.fluentUsername.localeCompare(b.fluentUsername);
      });

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      // Limit results
      return entries.slice(0, limit);
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      // Return empty array instead of throwing to prevent frontend errors
      return [];
    }
  }

  /**
   * Get leaderboard entry for a specific fluent speaker
   */
  async getFluentLeaderboardEntry(fluentId: string): Promise<LeaderboardEntry | null> {
    const leaderboard = await this.getLeaderboard(10000); // Get all entries
    return leaderboard.find(entry => entry.fluentId === fluentId) || null;
  }
}

export const leaderboardService = new LeaderboardService();

