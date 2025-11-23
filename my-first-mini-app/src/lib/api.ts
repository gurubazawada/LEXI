import type { Lesson, Review, FluentRating } from '@/types/lessons';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export async function fetchLessons(userId: string, limit: number = 50): Promise<{ lessons: Lesson[] }> {
  const response = await fetch(`${API_BASE_URL}/api/lessons/${userId}?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch lessons');
  }
  return response.json();
}

export async function fetchLesson(lessonId: string): Promise<{ lesson: Lesson }> {
  const response = await fetch(`${API_BASE_URL}/api/lessons/${lessonId}/details`);
  if (!response.ok) {
    throw new Error('Failed to fetch lesson');
  }
  return response.json();
}

export async function createReview(lessonId: string, learnerId: string, rating: number, comment?: string): Promise<{ review: Review }> {
  const response = await fetch(`${API_BASE_URL}/api/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lessonId, learnerId, rating, comment }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create review');
  }
  return response.json();
}

export async function fetchReviewForLesson(lessonId: string): Promise<{ review: Review | null }> {
  const response = await fetch(`${API_BASE_URL}/api/reviews/lesson/${lessonId}`);
  if (response.status === 404) {
    return { review: null };
  }
  if (!response.ok) {
    throw new Error('Failed to fetch review');
  }
  return response.json();
}

export async function fetchFluentRating(fluentId: string): Promise<{ rating: FluentRating }> {
  const response = await fetch(`${API_BASE_URL}/api/reviews/fluent/${fluentId}/rating`);
  if (!response.ok) {
    throw new Error('Failed to fetch rating');
  }
  return response.json();
}

export async function checkReviewExists(lessonId: string, learnerId: string): Promise<{ hasReviewed: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/reviews/lesson/${lessonId}/check?learnerId=${learnerId}`);
  if (!response.ok) {
    throw new Error('Failed to check review');
  }
  return response.json();
}

