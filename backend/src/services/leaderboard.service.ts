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
   * Get all fluent speakers who have lessons, grouped by wallet address
   * Returns a Map of walletAddress -> { fluentId, usernames }
   */
  private async getAllFluentSpeakers(): Promise<Map<string, { fluentId: string; usernames: string[] }>> {
    const fluentSpeakers = new Map<string, { fluentId: string; usernames: string[] }>();
    
    // Get all lesson keys
    const lessonKeys = await redisClient.keys('lesson:*');
    
    for (const key of lessonKeys) {
      // Skip review keys
      if (key.includes(':reviews')) {
        continue;
      }
      
      const lessonJson = await redisClient.get(key);
      if (lessonJson) {
        try {
          const lesson = JSON.parse(lessonJson);
          // Use wallet address as primary identifier (most reliable)
          const walletAddress = lesson.fluentWalletAddress || lesson.fluentId;
          
          if (walletAddress) {
            if (!fluentSpeakers.has(walletAddress)) {
              fluentSpeakers.set(walletAddress, {
                fluentId: lesson.fluentId,
                usernames: [],
              });
            }
            
            // Collect all usernames for this wallet address
            if (lesson.fluentUsername && !fluentSpeakers.get(walletAddress)!.usernames.includes(lesson.fluentUsername)) {
              fluentSpeakers.get(walletAddress)!.usernames.push(lesson.fluentUsername);
            }
          }
        } catch (error) {
          console.error(`Error parsing lesson from key ${key}:`, error);
        }
      }
    }
    
    return fluentSpeakers;
  }

  /**
   * Get leaderboard entries for all fluent speakers
   * Sorted by: 1) Average rating (desc), 2) Total sessions (desc), 3) Alphabetical (asc)
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    const fluentSpeakersMap = await this.getAllFluentSpeakers();
    const entries: LeaderboardEntry[] = [];

    // Get data for each fluent speaker (grouped by wallet address)
    for (const [walletAddress, { fluentId, usernames }] of fluentSpeakersMap.entries()) {
      try {
        // Find all lessons for this wallet address and collect all associated fluentIds
        const allLessonKeys = await redisClient.keys('lesson:*');
        const allLessons: any[] = [];
        const associatedFluentIds = new Set<string>();
        
        for (const key of allLessonKeys) {
          if (key.includes(':reviews')) continue;
          const lessonJson = await redisClient.get(key);
          if (lessonJson) {
            try {
              const lesson = JSON.parse(lessonJson);
              // Include if wallet address matches
              if (lesson.fluentWalletAddress === walletAddress || 
                  (lesson.fluentWalletAddress === undefined && lesson.fluentId === walletAddress)) {
                allLessons.push(lesson);
                if (lesson.fluentId) {
                  associatedFluentIds.add(lesson.fluentId);
                }
              }
            } catch (e) {
              // Skip invalid lessons
            }
          }
        }
        
        // Aggregate reviews across all fluentIds for this wallet address
        let totalReviews = 0;
        let totalRatingSum = 0;
        
        for (const fid of associatedFluentIds) {
          try {
            const rating = await reviewService.getFluentRating(fid);
            totalReviews += rating.totalReviews;
            totalRatingSum += rating.averageRating * rating.totalReviews;
          } catch (e) {
            // Skip if review fetch fails for this fluentId
          }
        }
        
        const averageRating = totalReviews > 0 ? totalRatingSum / totalReviews : 0;
        const totalSessions = allLessons.length;

        // Use the most recent username from lessons
        let fluentUsername = 'Unknown';
        if (usernames.length > 0) {
          const sortedLessons = allLessons.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
          if (sortedLessons.length > 0 && sortedLessons[0].fluentUsername) {
            fluentUsername = sortedLessons[0].fluentUsername;
          } else {
            // Fallback to most common username
            const usernameCounts = new Map<string, number>();
            usernames.forEach(name => {
              usernameCounts.set(name, (usernameCounts.get(name) || 0) + 1);
            });
            fluentUsername = Array.from(usernameCounts.entries())
              .sort((a, b) => b[1] - a[1])[0][0];
          }
        }

        // Only include fluent speakers who have at least one review
        if (totalReviews > 0) {
          entries.push({
            fluentId: walletAddress, // Use wallet address as the ID for consistency
            fluentUsername,
            fluentWalletAddress: walletAddress,
            averageRating,
            totalReviews,
            totalSessions,
            rank: 0, // Will be set after sorting
          });
        }
      } catch (error) {
        console.error(`Error processing fluent speaker ${walletAddress}:`, error);
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

