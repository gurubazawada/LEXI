# LEX Backend Matching Server

Real-time language partner matching server using Socket.io and Redis.

## Prerequisites

- Node.js 18+ 
- Redis server running locally or accessible via URL

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```
PORT=4000
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

## Running the Server

### Development (with auto-reload):
```bash
npm run dev
```

### Production:
```bash
npm run build
npm start
```

## Architecture

### Services
- **QueueService**: Manages user queues in Redis (join, leave, get size)
- **MatchingService**: Handles matching logic and stores match data

### Socket.io Events

#### Client → Server:
- `join_queue`: Join the matching queue
  ```typescript
  {
    role: 'learner' | 'fluent',
    language: string,
    userId?: string,
    username?: string,
    walletAddress?: string
  }
  ```
- `leave_queue`: Leave the queue
- `get_queue_status`: Get current queue size

#### Server → Client:
- `matched`: Match found
  ```typescript
  {
    partner: {
      username: string,
      walletAddress?: string,
      language: string,
      role: 'learner' | 'fluent'
    },
    userId: string
  }
  ```
- `queued`: Added to queue
  ```typescript
  {
    message: string,
    queueSize: number,
    userId: string
  }
  ```
- `error`: Error occurred
- `queue_status`: Queue status response

### Redis Data Structure

**Queues** (Lists):
- `queue:learner:{language}` - Learner queue per language
- `queue:fluent:{language}` - Fluent speaker queue per language

**Matches** (Strings with TTL):
- `match:{userId}` - Match data (expires in 5 minutes)

**Active Users** (Set):
- `active_users` - Track all users currently in system

## Testing

1. Start Redis:
```bash
redis-server
```

2. Start backend server:
```bash
npm run dev
```

3. Connect from frontend or use a Socket.io client to test events

## Deployment

The backend can be deployed to any Node.js hosting service:
- Railway
- Render
- Heroku
- AWS/GCP/Azure

Make sure to:
1. Set environment variables
2. Provision a Redis instance
3. Update CORS_ORIGIN to your frontend URL

