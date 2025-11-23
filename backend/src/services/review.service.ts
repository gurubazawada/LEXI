import { redisClient } from '../config/redis.js';
import type { Review, FluentRating } from '../types/index.js';
import { randomUUID } from 'crypto';
import { lessonService } from './lesson.service.js';

export class ReviewService {
  private getReviewKey(reviewId: string): string {
    return `review:${reviewId}`;
  }

  private getLessonReviewsKey(lessonId: string): string {
    return `lesson:${lessonId}:reviews`;
  }

  private getFluentReviewsKey(fluentId: string): string {
    return `fluent:${fluentId}:reviews`;
  }

  private getFluentRatingKey(fluentId: string): string {
    return `fluent:${fluentId}:rating`;
  }

  /**
   * Create a review for a lesson
   * Only learners can create reviews
   */
  async createReview(
    lessonId: string,
    learnerId: string,
    rating: number,
    comment?: string
  ): Promise<Review | null> {
    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    // Get lesson to verify it exists and get fluent speaker info
    const lesson = await lessonService.getLesson(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Verify the learner is the one creating the review
    if (lesson.learnerId !== learnerId) {
      throw new Error('Only the learner can create a review for this lesson');
    }

    // Check if review already exists for this lesson
    const existingReview = await this.getReviewByLesson(lessonId);
    if (existingReview) {
      throw new Error('Review already exists for this lesson');
    }

    const reviewId = randomUUID();
    const createdAt = Date.now();

    const review: Review = {
      id: reviewId,
      lessonId,
      learnerId,
      learnerUsername: lesson.learnerUsername,
      fluentId: lesson.fluentId,
      fluentUsername: lesson.fluentUsername,
      rating,
      comment,
      createdAt,
    };

    // Store review
    await redisClient.set(this.getReviewKey(reviewId), JSON.stringify(review));

    // Add review ID to lesson's reviews list
    await redisClient.lPush(this.getLessonReviewsKey(lessonId), reviewId);

    // Add review ID to fluent speaker's reviews list
    await redisClient.lPush(this.getFluentReviewsKey(lesson.fluentId), reviewId);

    // Update fluent speaker's composite rating
    await this.updateFluentRating(lesson.fluentId);

    console.log(`✓ Review created: ${reviewId} (${rating} stars by ${lesson.learnerUsername})`);

    return review;
  }

  /**
   * Get a review by ID
   */
  async getReview(reviewId: string): Promise<Review | null> {
    const reviewJson = await redisClient.get(this.getReviewKey(reviewId));
    
    if (!reviewJson) {
      return null;
    }

    return JSON.parse(reviewJson) as Review;
  }

  /**
   * Get review for a specific lesson
   */
  async getReviewByLesson(lessonId: string): Promise<Review | null> {
    const reviewIds = await redisClient.lRange(this.getLessonReviewsKey(lessonId), 0, 0);
    
    if (reviewIds.length === 0) {
      return null;
    }

    return this.getReview(reviewIds[0]);
  }

  /**
   * Get all reviews for a fluent speaker
   */
  async getFluentReviews(fluentId: string, limit: number = 50): Promise<Review[]> {
    const reviewIds = await redisClient.lRange(this.getFluentReviewsKey(fluentId), 0, limit - 1);
    
    const reviews: Review[] = [];
    
    for (const reviewId of reviewIds) {
      const review = await this.getReview(reviewId);
      if (review) {
        reviews.push(review);
      }
    }

    // Sort by createdAt descending (most recent first)
    return reviews.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get composite rating for a fluent speaker
   */
  async getFluentRating(fluentId: string): Promise<FluentRating> {
    const ratingJson = await redisClient.get(this.getFluentRatingKey(fluentId));
    
    if (ratingJson) {
      return JSON.parse(ratingJson) as FluentRating;
    }

    // If no rating exists, calculate it from reviews
    return this.updateFluentRating(fluentId);
  }

  /**
   * Update composite rating for a fluent speaker
   */
  async updateFluentRating(fluentId: string): Promise<FluentRating> {
    const reviews = await this.getFluentReviews(fluentId, 1000);
    
    if (reviews.length === 0) {
      const rating: FluentRating = {
        fluentId,
        averageRating: 0,
        totalReviews: 0,
        ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
      await redisClient.set(this.getFluentRatingKey(fluentId), JSON.stringify(rating));
      return rating;
    }

    const ratings: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const review of reviews) {
      ratings[review.rating] = (ratings[review.rating] || 0) + 1;
      totalRating += review.rating;
    }

    const averageRating = totalRating / reviews.length;

    const fluentRating: FluentRating = {
      fluentId,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews: reviews.length,
      ratings,
    };

    await redisClient.set(this.getFluentRatingKey(fluentId), JSON.stringify(fluentRating));

    return fluentRating;
  }

  /**
   * Check if a learner has already reviewed a lesson
   */
  async hasReviewedLesson(lessonId: string, learnerId: string): Promise<boolean> {
    const review = await this.getReviewByLesson(lessonId);
    return review !== null && review.learnerId === learnerId;
  }
}

export const reviewService = new ReviewService();

