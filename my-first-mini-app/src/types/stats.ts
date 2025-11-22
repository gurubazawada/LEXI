export interface UserStats {
  totalChats: number;
  currentStreak: number;
  communityRank: string; // e.g., "Top 10%", "Top 25%", etc.
  lastActiveDate?: string;
  bestStreak?: number;
}

export interface StatsResponse {
  stats: UserStats;
  success: boolean;
}

