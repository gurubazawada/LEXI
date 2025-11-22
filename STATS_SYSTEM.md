# User Stats System

## Overview
The stats system displays user engagement metrics on the main match page, including total chats, current streak, and community rank.

## Current Implementation

### Stats Displayed
1. **Total Chats** - Total number of completed conversations
2. **Current Streak** - Consecutive days of activity (with flame icon)
3. **Community Rank** - User's ranking in the community (e.g., "Top 10%")

### UI Layout
- Logo moved to top left with username
- Stats displayed in a 3-column grid below the header
- Only visible when `status === 'idle'` (not during matching/matched states)
- Responsive design with proper dark mode support

### Components Created

#### 1. Stats Types (`/src/types/stats.ts`)
```typescript
export interface UserStats {
  totalChats: number;
  currentStreak: number;
  communityRank: string;
  lastActiveDate?: string;
  bestStreak?: number;
}
```

#### 2. Stats API (`/src/app/api/stats/route.ts`)
- **GET /api/stats** - Fetches user statistics
- **POST /api/stats/increment** - Increments specific stat counters
- Currently returns placeholder data (0, 0, "--")
- Requires authentication via NextAuth session

#### 3. Match Page Updates (`/src/app/match/page.tsx`)
- Header redesigned: Logo + username in top left
- Stats grid added below header
- Fetches stats on component mount
- Uses iconoir-react icons (ChatLines, Flame, Medal)

## TODO: Backend Implementation

To make the stats system functional, you need to implement:

### 1. Database/Redis Schema
```typescript
// User Stats in Redis
user:stats:{walletAddress} = {
  totalChats: number,
  currentStreak: number,
  lastActiveDate: string (ISO),
  bestStreak: number,
  totalPracticeTime: number (minutes)
}

// Global Stats for Ranking
global:stats:totalUsers = number
global:stats:activeUsers = sorted set (by activity score)
```

### 2. Stat Tracking Events

#### Track Chat Completion
When a match leads to a successful chat:
```typescript
// In backend/src/socket/handlers.ts or match page
// After chat is sent successfully
await fetch('/api/stats/increment', {
  method: 'POST',
  body: JSON.stringify({ stat: 'totalChats' })
});
```

#### Track Daily Login (Streak)
```typescript
// Check if user logged in today
const today = new Date().toISOString().split('T')[0];
const lastActive = stats.lastActiveDate?.split('T')[0];

if (lastActive !== today) {
  // Check if consecutive day
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (lastActive === yesterday) {
    // Increment streak
    stats.currentStreak += 1;
  } else {
    // Reset streak
    stats.currentStreak = 1;
  }
  
  stats.lastActiveDate = new Date().toISOString();
  stats.bestStreak = Math.max(stats.bestStreak || 0, stats.currentStreak);
}
```

#### Calculate Community Rank
```typescript
// Based on activity score (chats + streak)
const activityScore = (totalChats * 10) + (currentStreak * 5);

// Get user's percentile
const totalUsers = await redis.get('global:stats:totalUsers');
const rank = await redis.zrevrank('global:stats:activeUsers', walletAddress);
const percentile = Math.floor((rank / totalUsers) * 100);

let communityRank = '--';
if (percentile <= 10) communityRank = 'Top 10%';
else if (percentile <= 25) communityRank = 'Top 25%';
else if (percentile <= 50) communityRank = 'Top 50%';
else communityRank = `${percentile}%`;
```

### 3. Redis Implementation Example

```typescript
// backend/src/services/stats.service.ts
import { redisClient } from '../config/redis.js';

export class StatsService {
  private getUserStatsKey(walletAddress: string): string {
    return `user:stats:${walletAddress}`;
  }

  async getUserStats(walletAddress: string): Promise<UserStats> {
    const key = this.getUserStatsKey(walletAddress);
    const data = await redisClient.get(key);
    
    if (!data) {
      return {
        totalChats: 0,
        currentStreak: 0,
        communityRank: '--',
        lastActiveDate: new Date().toISOString(),
        bestStreak: 0,
      };
    }
    
    return JSON.parse(data);
  }

  async incrementTotalChats(walletAddress: string): Promise<void> {
    const stats = await this.getUserStats(walletAddress);
    stats.totalChats += 1;
    
    await redisClient.set(
      this.getUserStatsKey(walletAddress),
      JSON.stringify(stats)
    );
    
    // Update activity score for ranking
    const activityScore = (stats.totalChats * 10) + (stats.currentStreak * 5);
    await redisClient.zadd('global:stats:activeUsers', activityScore, walletAddress);
  }

  async updateStreak(walletAddress: string): Promise<void> {
    const stats = await this.getUserStats(walletAddress);
    const today = new Date().toISOString().split('T')[0];
    const lastActive = stats.lastActiveDate?.split('T')[0];

    if (lastActive === today) {
      return; // Already updated today
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (lastActive === yesterday) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    
    stats.lastActiveDate = new Date().toISOString();
    stats.bestStreak = Math.max(stats.bestStreak || 0, stats.currentStreak);
    
    await redisClient.set(
      this.getUserStatsKey(walletAddress),
      JSON.stringify(stats)
    );
  }

  async getCommunityRank(walletAddress: string): Promise<string> {
    const rank = await redisClient.zrevrank('global:stats:activeUsers', walletAddress);
    const totalUsers = await redisClient.zcard('global:stats:activeUsers');
    
    if (rank === null || totalUsers === 0) {
      return '--';
    }
    
    const percentile = Math.floor((rank / totalUsers) * 100);
    
    if (percentile <= 10) return 'Top 10%';
    if (percentile <= 25) return 'Top 25%';
    if (percentile <= 50) return 'Top 50%';
    return `${percentile}%`;
  }
}

export const statsService = new StatsService();
```

### 4. Integration Points

#### When to Increment Stats:

1. **Total Chats** - Increment when:
   - Chat message is successfully sent (in `sendChatMessage` callback)
   - Or when match is completed and chat is opened

2. **Current Streak** - Update when:
   - User logs in (check in auth callback)
   - User enters queue (first action of the day)

3. **Community Rank** - Calculate when:
   - Stats are fetched (GET /api/stats)
   - After any stat is incremented

## Visual Design

### Stats Card Layout
```
┌─────────────────────────────────────┐
│  [Logo] Lexi                        │
│         Username                    │
├─────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │ 💬  │  │ 🔥  │  │ 🏅  │        │
│  │ 23  │  │  5  │  │Top  │        │
│  │Chats│  │Streak│  │10% │        │
│  └─────┘  └─────┘  └─────┘        │
└─────────────────────────────────────┘
```

### Icon Colors
- **Chats**: Black/White (theme color)
- **Streak**: Orange (#f97316)
- **Rank**: Yellow (#eab308)

## Next Steps

1. Implement `StatsService` in backend
2. Add stat tracking to match completion flow
3. Add streak tracking to authentication flow
4. Test stat increments and persistence
5. Add animations for stat updates (optional)
6. Add "Best Streak" display (optional)
7. Add stat history/graphs (future enhancement)

