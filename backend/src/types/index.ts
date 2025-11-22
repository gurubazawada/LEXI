export interface UserData {
  id: string;
  username: string;
  walletAddress?: string;
  role: 'learner' | 'fluent';
  language: string;
  timestamp: number;
  socketId: string;
}

export interface PartnerData {
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

