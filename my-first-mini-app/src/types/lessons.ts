export interface Lesson {
  id: string;
  learnerId: string;
  learnerUsername: string;
  learnerWalletAddress?: string;
  fluentId: string;
  fluentUsername: string;
  fluentWalletAddress?: string;
  language: string;
  startedAt: number;
  endedAt?: number;
  duration?: number; // in seconds
}

export interface Review {
  id: string;
  lessonId: string;
  learnerId: string;
  learnerUsername: string;
  fluentId: string;
  fluentUsername: string;
  rating: number; // 1-5 stars
  comment?: string;
  createdAt: number;
}

export interface FluentRating {
  fluentId: string;
  averageRating: number;
  totalReviews: number;
  ratings: {
    [key: number]: number; // rating -> count
  };
}

