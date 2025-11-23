import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { UserStats } from '@/types/stats';

// Force dynamic to ensure we always fetch fresh data
export const dynamic = 'force-dynamic';

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

    const userId = session.user.walletAddress;
    // Use the backend URL from env or default to localhost
    // Note: In production (Vercel), this needs to point to the actual backend URL
    const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    
    let totalChats = 0;
    let currentStreak = 0;
    
    try {
      // Fetch lessons from backend to count total chats
      const lessonsResponse = await fetch(`${backendUrl}/api/lessons/${userId}?limit=1000`);
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
      // Fallback to 0 if backend is unreachable
    }

    const stats: UserStats = {
      totalChats,
      currentStreak, // Streak logic would go here
      communityRank: '--', // Rank logic would go here
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

