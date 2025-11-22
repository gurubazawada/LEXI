import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// In-memory queue for demonstration (would be a database in production)
// This will reset when the server restarts (e.g. on code changes in dev)
const queue = {
  learners: [] as any[],
  fluent: [] as any[],
};

// Store matches so both users can retrieve them
const matches = new Map<string, {
  partner: any;
  timestamp: number;
}>();

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    // In a real app, we'd require the session
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await req.json();
    const { role, language } = body;

    if (!role || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Mock user data if session is missing (for dev/testing without wallet)
    const user = {
      id: session?.user?.id || 'anon-' + Math.random().toString(36).substring(7),
      username: session?.user?.username || 'Anonymous',
      role,
      language,
      timestamp: Date.now(),
    };

    // Add to appropriate queue
    if (role === 'learner') {
      queue.learners.push(user);
    } else {
      queue.fluent.push(user);
    }

    console.log(`User ${user.username} joined queue as ${role} for ${language}`);

    // Simulate matching delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Check for match (very simple logic)
    const matchQueue = role === 'learner' ? queue.fluent : queue.learners;
    const match = matchQueue.find((u) => u.language === language);

    if (match) {
      // Remove both users from queue
      if (role === 'learner') {
        queue.fluent = queue.fluent.filter(u => u.id !== match.id);
        queue.learners = queue.learners.filter(u => u.id !== user.id);
      } else {
        queue.learners = queue.learners.filter(u => u.id !== match.id);
        queue.fluent = queue.fluent.filter(u => u.id !== user.id);
      }

      // Store match for both users so they can both retrieve it
      const matchData = {
        partner: {
          username: match.username,
          language: match.language,
          role: match.role,
        },
        timestamp: Date.now(),
      };

      matches.set(user.id, {
        partner: {
          username: match.username,
          language: match.language,
          role: match.role,
        },
        timestamp: Date.now(),
      });

      matches.set(match.id, {
        partner: {
          username: user.username,
          language: user.language,
          role: user.role,
        },
        timestamp: Date.now(),
      });

      return NextResponse.json({
        status: 'matched',
        partner: matchData.partner,
        userId: user.id,
      });
    }

    // If no immediate match, return "queued" status
    // (In a real app, we'd use WebSockets or polling to notify of future matches)
    return NextResponse.json({
      status: 'queued',
      message: 'Added to queue. Waiting for a partner...',
      queueSize: role === 'learner' ? queue.learners.length : queue.fluent.length,
      userId: user.id, // Return userId so frontend can poll for matches
    });

  } catch (error) {
    console.error('Queue error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user has been matched
export async function GET(req: Request) {
  try {
    const session = await auth();
    
    // Mock user ID if session is missing (for dev/testing without wallet)
    const userId = session?.user?.id || new URL(req.url).searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Check if user has a match
    const match = matches.get(userId);
    
    if (match) {
      // Clean up old matches (older than 5 minutes)
      if (Date.now() - match.timestamp > 5 * 60 * 1000) {
        matches.delete(userId);
        return NextResponse.json({ status: 'queued' });
      }

      return NextResponse.json({
        status: 'matched',
        partner: match.partner,
      });
    }

    // Check if user is still in queue
    const inLearnerQueue = queue.learners.some(u => u.id === userId);
    const inFluentQueue = queue.fluent.some(u => u.id === userId);

    if (inLearnerQueue || inFluentQueue) {
      return NextResponse.json({
        status: 'queued',
        message: 'Still waiting for a partner...',
      });
    }

    // User is not in queue and has no match
    return NextResponse.json({
      status: 'idle',
      message: 'Not in queue',
    });

  } catch (error) {
    console.error('Queue check error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

