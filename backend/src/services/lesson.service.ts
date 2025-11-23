import { redisClient } from '../config/redis.js';
import type { Lesson } from '../types/index.js';
import { randomUUID } from 'crypto';

export class LessonService {
  private getLessonKey(lessonId: string): string {
    return `lesson:${lessonId}`;
  }

  private getUserLessonsKey(userId: string): string {
    return `user:${userId}:lessons`;
  }

  /**
   * Create a new lesson when two users match
   */
  async createLesson(
    learnerId: string,
    learnerUsername: string,
    learnerWalletAddress: string | undefined,
    fluentId: string,
    fluentUsername: string,
    fluentWalletAddress: string | undefined,
    language: string
  ): Promise<Lesson> {
    const lessonId = randomUUID();
    const startedAt = Date.now();

    const lesson: Lesson = {
      id: lessonId,
      learnerId,
      learnerUsername,
      learnerWalletAddress,
      fluentId,
      fluentUsername,
      fluentWalletAddress,
      language,
      startedAt,
    };

    // Store lesson data
    await redisClient.set(this.getLessonKey(lessonId), JSON.stringify(lesson));

    // Add lesson ID to both users' lesson lists
    const learnerKey = this.getUserLessonsKey(learnerId);
    const fluentKey = this.getUserLessonsKey(fluentId);
    
    await redisClient.lPush(learnerKey, lessonId);
    await redisClient.lPush(fluentKey, lessonId);

    console.log(`✓ Lesson created: ${lessonId} (${learnerUsername} ↔ ${fluentUsername})`);
    console.log(`  📝 Added to learner list: ${learnerKey}`);
    console.log(`  📝 Added to fluent list: ${fluentKey}`);

    return lesson;
  }

  /**
   * End a lesson (update end time and duration)
   */
  async endLesson(lessonId: string): Promise<Lesson | null> {
    const lessonJson = await redisClient.get(this.getLessonKey(lessonId));
    
    if (!lessonJson) {
      return null;
    }

    const lesson = JSON.parse(lessonJson) as Lesson;
    const endedAt = Date.now();
    const duration = Math.floor((endedAt - lesson.startedAt) / 1000); // duration in seconds

    const updatedLesson: Lesson = {
      ...lesson,
      endedAt,
      duration,
    };

    await redisClient.set(this.getLessonKey(lessonId), JSON.stringify(updatedLesson));

    return updatedLesson;
  }

  /**
   * Get a lesson by ID
   */
  async getLesson(lessonId: string): Promise<Lesson | null> {
    const lessonJson = await redisClient.get(this.getLessonKey(lessonId));
    
    if (!lessonJson) {
      return null;
    }

    return JSON.parse(lessonJson) as Lesson;
  }

  /**
   * Get all lessons for a user
   */
  async getUserLessons(userId: string, limit: number = 50): Promise<Lesson[]> {
    const userLessonsKey = this.getUserLessonsKey(userId);
    console.log(`  🔍 Looking up lessons for key: ${userLessonsKey}`);
    
    const lessonIds = await redisClient.lRange(userLessonsKey, 0, limit - 1);
    console.log(`  📋 Found ${lessonIds.length} lesson IDs for user ${userId}`);
    
    if (lessonIds.length === 0) {
      console.log(`  ℹ️ No lessons found for user ${userId}`);
      return [];
    }
    
    const lessons: Lesson[] = [];
    
    // Fetch all lessons in parallel for better performance
    const lessonPromises = lessonIds.map(async (lessonId) => {
      try {
        const lesson = await this.getLesson(lessonId);
        if (!lesson) {
          console.warn(`  ⚠️ Lesson ${lessonId} not found in Redis`);
        }
        return lesson;
      } catch (error) {
        console.error(`  ❌ Error fetching lesson ${lessonId}:`, error);
        return null;
      }
    });
    
    const lessonResults = await Promise.all(lessonPromises);
    
    // Filter out null results
    for (const lesson of lessonResults) {
      if (lesson) {
        lessons.push(lesson);
      }
    }

    console.log(`  ✓ Retrieved ${lessons.length} valid lessons out of ${lessonIds.length} IDs`);
    
    // Sort by startedAt descending (most recent first)
    return lessons.sort((a, b) => b.startedAt - a.startedAt);
  }

  /**
   * Get lessons for a user with a specific partner
   */
  async getUserLessonsWithPartner(userId: string, partnerId: string): Promise<Lesson[]> {
    const allLessons = await this.getUserLessons(userId, 1000);
    return allLessons.filter(
      lesson => lesson.learnerId === partnerId || lesson.fluentId === partnerId
    );
  }
}

export const lessonService = new LessonService();

