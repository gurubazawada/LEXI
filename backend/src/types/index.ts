export interface UserData {
  id: string;
  username: string;
  walletAddress?: string;
  role: 'learner' | 'fluent';
  language: string;
  timestamp: number;
  socketId?: string; // Optional - looked up dynamically from socket tracking service
}

export interface PartnerData {
  id: string;
  username: string;
  walletAddress?: string;
  language: string;
  role: 'learner' | 'fluent';
}

export interface MatchData {
  partner: PartnerData;
  timestamp: number;
}

export interface JoinQueuePayload {
  role: 'learner' | 'fluent';
  language: string;
  userId?: string;
  username?: string;
  walletAddress?: string;
}

export interface QueueStatusPayload {
  queueSize: number;
  role: 'learner' | 'fluent';
  language: string;
}

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

