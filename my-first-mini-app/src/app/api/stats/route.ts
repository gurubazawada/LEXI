import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { UserStats } from '@/types/stats';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

/**
 * GET /api/stats
 * Returns user statistics including total chats, streak, and community rank
 * 
 * TODO: Implement actual stat tracking
 * - Store chat completions in Redis/Database
 * - Track daily logins for streak calculation
 * - Calculate community rank based on activity
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

    // Fetch user's rank from leaderboard
    let rank: number | null = null;
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
          rank = userEntry.rank;
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard for rank:', error);
      // Continue without rank if leaderboard fetch fails
    }

    // Format rank display
    let communityRank = '--';
    if (rank !== null) {
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

    // TODO: Fetch actual stats from Redis/Database
    // For now, return placeholder data with rank
    const stats: UserStats = {
      totalChats: 0,
      currentStreak: 0,
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

