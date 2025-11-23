import type { Lesson, Review, FluentRating, LeaderboardEntry } from '@/types/lessons';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export async function createLesson(
  learnerId: string,
  learnerUsername: string,
  learnerWalletAddress: string | undefined,
  fluentId: string,
  fluentUsername: string,
  fluentWalletAddress: string | undefined,
  language: string
): Promise<{ lesson: Lesson }> {
  const response = await fetch(`${API_BASE_URL}/api/lessons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      learnerId,
      learnerUsername,
      learnerWalletAddress,
      fluentId,
      fluentUsername,
      fluentWalletAddress,
      language,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create lesson');
  }
  return response.json();
}

export async function fetchLessons(userId: string, limit: number = 50): Promise<{ lessons: Lesson[] }> {
  const url = `${API_BASE_URL}/api/lessons/${userId}?limit=${limit}`;
  console.log(`📚 Fetching lessons from: ${url}`);
  
  if (!userId) {
    console.error('❌ No userId provided to fetchLessons');
    throw new Error('User ID is required');
  }
  
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch lessons: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch lessons: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✓ Fetched ${data.lessons?.length || 0} lessons`);
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Request timeout - backend may not be responding');
      throw new Error('Request timed out. Please check if the backend server is running.');
    }
    console.error('❌ Error in fetchLessons:', error);
    throw error;
  }
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

export async function fetchLeaderboard(limit: number = 100): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const response = await fetch(`${API_BASE_URL}/api/leaderboard?limit=${limit}`);
  
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If JSON parsing fails, use the default error message
    }
    console.error('Leaderboard fetch error:', errorMessage);
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  return { leaderboard: data.leaderboard || [] };
}

export async function fetchFluentLeaderboardEntry(fluentId: string): Promise<{ entry: LeaderboardEntry }> {
  const response = await fetch(`${API_BASE_URL}/api/leaderboard/${fluentId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard entry');
  }
  return response.json();
}

