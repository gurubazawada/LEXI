import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// In-memory queue for demonstration (would be a database in production)
// This will reset when the server restarts (e.g. on code changes in dev)
const queue = {
  learners: [] as any[],
  fluent: [] as any[],
};

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
      // Remove match from queue
      if (role === 'learner') {
        queue.fluent = queue.fluent.filter(u => u.id !== match.id);
        queue.learners = queue.learners.filter(u => u.id !== user.id); // Remove self
      } else {
        queue.learners = queue.learners.filter(u => u.id !== match.id);
        queue.fluent = queue.fluent.filter(u => u.id !== user.id); // Remove self
      }

      return NextResponse.json({
        status: 'matched',
        partner: {
          username: match.username,
          language: match.language,
        },
      });
    }

    // If no immediate match, return "queued" status
    // (In a real app, we'd use WebSockets or polling to notify of future matches)
    return NextResponse.json({
      status: 'queued',
      message: 'Added to queue. Waiting for a partner...',
      queueSize: role === 'learner' ? queue.learners.length : queue.fluent.length
    });

  } catch (error) {
    console.error('Queue error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

