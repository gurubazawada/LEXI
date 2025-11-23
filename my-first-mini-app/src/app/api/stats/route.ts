import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { UserStats } from '@/types/stats';

// Force dynamic to ensure we always fetch fresh data
export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

/**
 * GET /api/stats
 * Returns user statistics including total chats, streak, and community rank
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.walletAddress) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const walletAddress = session.user.walletAddress;
    
    let totalChats = 0;
    let currentStreak = 0;
    let communityRank = '--';
    
    // Fetch lessons from backend to count total chats
    try {
      const lessonsResponse = await fetch(`${API_BASE_URL}/api/lessons/${walletAddress}?limit=1000`);
      if (lessonsResponse.ok) {
        const data = await lessonsResponse.json();
        if (data.lessons && Array.isArray(data.lessons)) {
          totalChats = data.lessons.length;
        }
      } else {
        console.warn('Failed to fetch lessons from backend:', lessonsResponse.status, lessonsResponse.statusText);
      }
    } catch (fetchError) {
      console.error('Error fetching data from backend:', fetchError);
    }

    // Fetch user's rank from leaderboard
    try {
      const leaderboardResponse = await fetch(`${API_BASE_URL}/api/leaderboard?limit=1000`);
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        // Check both fluentId and fluentWalletAddress since fluentId might be the wallet address
        const userEntry = leaderboardData.leaderboard.find(
          (entry: any) => 
            entry.fluentId === walletAddress || 
            entry.fluentWalletAddress === walletAddress
        );
        
        if (userEntry) {
          const rank = userEntry.rank;
          if (rank === 1) {
            communityRank = '#1';
          } else if (rank === 2) {
            communityRank = '#2';
          } else if (rank === 3) {
            communityRank = '#3';
          } else {
            communityRank = `#${rank}`;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard for rank:', error);
    }

    const stats: UserStats = {
      totalChats,
      currentStreak, // Streak logic would go here
      communityRank,
      lastActiveDate: new Date().toISOString(),
      bestStreak: 0,
    };

    return NextResponse.json({
      stats,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stats/increment
 * Increments a specific stat counter
 * 
 * Body: { stat: 'totalChats' | 'currentStreak' }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.walletAddress) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { stat } = await request.json();

    // TODO: Implement stat increment logic
    // - Increment counter in Redis/Database
    // - Update streak if daily login
    // - Recalculate community rank if needed

    return NextResponse.json({
      success: true,
      message: `${stat} incremented`,
    });
  } catch (error) {
    console.error('Error incrementing stat:', error);
    return NextResponse.json(
      { error: 'Failed to increment stat' },
      { status: 500 }
    );
  }
}
