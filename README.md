# LEX - Language Exchange Platform

A real-time language learning platform that matches learners with fluent speakers for practice conversations.

## Architecture

### Frontend (Next.js)
- Location: `my-first-mini-app/`
- Framework: Next.js 15 with React 19
- Real-time: Socket.io client
- Auth: NextAuth with Worldcoin MiniKit

### Backend (Node.js)
- Location: `backend/`
- Framework: Express + Socket.io
- Database: Redis for queue management and match storage
- Real-time matching with atomic operations

## Prerequisites

- Node.js 18 or higher
- Redis server (local or remote)
- npm or pnpm

## Quick Start

### 1. Install Redis

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Windows:**
Download from https://redis.io/download or use WSL

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` if needed (defaults should work for local development):
```
PORT=4000
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

Start the backend server:
```bash
npm run dev
```

You should see:
```
✓ Connected to Redis
🚀 Server running on port 4000
📡 Socket.io listening for connections
```

### 3. Setup Frontend

```bash
cd my-first-mini-app
npm install --legacy-peer-deps
```

Create `.env.local` file:
```bash
# Copy from .env.example if it exists, or create manually
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:4000" > .env.local
```

Start the frontend:
```bash
npm run dev
```

Frontend will be available at http://localhost:3000

## Testing the Matching System

1. Open http://localhost:3000 in two different browser windows (or use incognito mode)
2. In the first window:
   - Select "Learner" role
   - Choose a language (e.g., Spanish)
   - Click "Enter Queue"
   - You should see "Finding a partner..."
3. In the second window:
   - Select "Fluent Guide" role
   - Choose the same language (Spanish)
   - Click "Enter Queue"
   - Both windows should instantly show "It's a Match!"

## How It Works

### Matching Flow

1. **User Joins Queue**
   - Frontend connects to backend via Socket.io
   - User selects role (learner/fluent) and language
   - Socket.io emits `join_queue` event

2. **Backend Processing**
   - Adds user to Redis queue: `queue:{role}:{language}`
   - Attempts immediate match with opposite role
   - If match found:
     - Removes both users from queues atomically
     - Stores match data with 5-minute TTL
     - Emits `matched` event to both clients
   - If no match:
     - User stays in queue
     - Emits `queued` event to client

3. **Match Notification**
   - Both users receive real-time `matched` event
   - Frontend displays partner information
   - Option to start chat via World App

### Key Features

- **Atomic Matching**: Redis transactions prevent race conditions
- **Real-time Updates**: Socket.io eliminates polling overhead
- **Persistent State**: Redis persistence survives server restarts
- **Auto Cleanup**: Matches expire after 5 minutes
- **Disconnect Handling**: Users removed from queue on disconnect

## Project Structure

```
LEX/
├── backend/                    # Node.js matching server
│   ├── src/
│   │   ├── server.ts          # Express + Socket.io setup
│   │   ├── config/
│   │   │   └── redis.ts       # Redis client
│   │   ├── services/
│   │   │   ├── queue.service.ts    # Queue operations
│   │   │   └── matching.service.ts # Matching logic
│   │   ├── socket/
│   │   │   └── handlers.ts    # Socket.io events
│   │   └── types/
│   │       └── index.ts       # TypeScript types
│   └── package.json
│
└── my-first-mini-app/         # Next.js frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx       # Main matching UI
    │   │   └── api/           # NextAuth routes
    │   ├── hooks/
    │   │   └── useSocket.ts   # Socket.io hook
    │   ├── components/        # UI components
    │   └── auth/              # Authentication
    └── package.json
```

## Development Commands

### Backend
```bash
cd backend
npm run dev      # Development with auto-reload
npm run build    # Build for production
npm start        # Run production build
```

### Frontend
```bash
cd my-first-mini-app
npm run dev      # Development server
npm run build    # Build for production
npm start        # Run production build
npm run lint     # Run ESLint
```

## Environment Variables

### Backend (.env)
- `PORT`: Server port (default: 4000)
- `REDIS_URL`: Redis connection URL
- `CORS_ORIGIN`: Allowed frontend origin
- `NODE_ENV`: Environment (development/production)

### Frontend (.env.local)
- `NEXT_PUBLIC_SOCKET_URL`: Backend Socket.io URL
- `NEXTAUTH_SECRET`: NextAuth secret key
- `NEXTAUTH_URL`: Frontend URL
- `HMAC_SECRET_KEY`: HMAC secret for nonce hashing

## Troubleshooting

### Backend won't start
- Check if Redis is running: `redis-cli ping`
- Verify port 4000 is available: `lsof -i :4000`
- Check backend logs for errors

### Frontend can't connect
- Verify backend is running on port 4000
- Check `NEXT_PUBLIC_SOCKET_URL` in `.env.local`
- Check browser console for connection errors
- Verify CORS settings in backend

### Matches not working
- Check Redis has data: `redis-cli KEYS queue:*`
- Verify both users select same language
- Check backend logs for matching attempts
- Ensure both users have opposite roles

### Clear Redis data (reset queues)
```bash
redis-cli FLUSHDB
```

## Production Deployment

### Backend
Deploy to Railway, Render, Heroku, or any Node.js host:
1. Provision Redis instance (Railway, Redis Cloud, etc.)
2. Set environment variables
3. Deploy backend code
4. Note the backend URL

### Frontend
Deploy to Vercel, Netlify, or any Next.js host:
1. Set `NEXT_PUBLIC_SOCKET_URL` to backend URL
2. Configure other environment variables
3. Deploy frontend code

## License

MIT
