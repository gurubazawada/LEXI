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
    await redisClient.lPush(this.getUserLessonsKey(learnerId), lessonId);
    await redisClient.lPush(this.getUserLessonsKey(fluentId), lessonId);

    console.log(`✓ Lesson created: ${lessonId} (${learnerUsername} ↔ ${fluentUsername})`);

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
    const lessonIds = await redisClient.lRange(this.getUserLessonsKey(userId), 0, limit - 1);
    
    const lessons: Lesson[] = [];
    
    for (const lessonId of lessonIds) {
      const lesson = await this.getLesson(lessonId);
      if (lesson) {
        lessons.push(lesson);
      }
    }

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

