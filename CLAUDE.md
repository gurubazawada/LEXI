# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LEX is a real-time language learning platform that matches learners with fluent speakers for practice conversations. The system uses a monorepo structure with a Node.js backend for matching logic and a Next.js frontend for the user interface.

## Development Commands

### Installation
```bash
# Install all dependencies for both frontend and backend
npm run install:all

# Alternative: Install separately
cd backend && npm install
cd my-first-mini-app && npm install --legacy-peer-deps
```

### Running the Application

**Prerequisites:** Redis must be running locally (`redis-cli ping` should return PONG)

```bash
# Backend (from root)
npm run dev:backend
# Runs on http://localhost:4000

# Frontend (from root)
npm run dev:frontend
# Runs on http://localhost:3000

# Or run from subdirectories
cd backend && npm run dev
cd my-first-mini-app && npm run dev
```

### Building
```bash
# Backend
npm run build:backend
# Or: cd backend && npm run build

# Frontend
npm run build:frontend
# Or: cd my-first-mini-app && npm run build
```

### Backend-Specific Commands
```bash
cd backend
npm run dev      # Development with hot reload (tsx watch)
npm run build    # TypeScript compilation to dist/
npm start        # Run production build
```

### Frontend-Specific Commands
```bash
cd my-first-mini-app
npm run dev      # Next.js development server
npm run build    # Production build
npm start        # Run production build
npm run lint     # ESLint
```

## Architecture

### Backend (`backend/`)

**Technology Stack:**
- Express + Socket.io for real-time connections
- Redis for queue management and state persistence
- TypeScript with ES modules

**Key Components:**

1. **Real-time Matching Flow** (`src/socket/handlers.ts:11-163`)
   - Users emit `join_queue` with role (learner/fluent) and language
   - Backend attempts immediate match with opposite role
   - If match found: both users notified via `matched` event
   - If no match: user stays queued, receives `queued` event
   - Atomic operations prevent race conditions

2. **Queue Service** (`src/services/queue.service.ts`)
   - FIFO queues per role+language combo: `queue:{role}:{language}`
   - Uses Redis lists (LPUSH/RPOP) for queue operations
   - Tracks active users in Redis set for fast lookup
   - Auto-cleanup on disconnect removes user from all queues

3. **Matching Service** (`src/services/matching.service.ts`)
   - Finds matches by checking opposite role queue
   - Stores match data with 5-minute TTL
   - Prevents duplicate matching via `hasActiveMatch` check
   - Match key format: `match:{userId}`

4. **Type System** (`src/types/index.ts`)
   - `UserData`: Full user info including socketId
   - `PartnerData`: Subset sent to matched partner
   - `MatchData`: Partner info + timestamp
   - All interfaces shared between services

**Critical Implementation Details:**
- Backend uses ES modules (`"type": "module"` in package.json)
- All imports must include `.js` extension (TypeScript ES module requirement)
- Redis atomic operations prevent race conditions during matching
- Socket disconnects trigger cleanup of all queue entries

### Frontend (`my-first-mini-app/`)

**Technology Stack:**
- Next.js 15 with App Router
- React 19
- Worldcoin MiniKit for authentication
- Socket.io-client for real-time connection
- Tailwind + shadcn/ui components

**Key Components:**

1. **Main Matching UI** (`src/app/page.tsx`)
   - Single-page flow: role selection → language selection → queue → match
   - State machine: `idle` → `loading` → `queued` → `matched`
   - Auto-sends chat message via MiniKit when learner matches with fluent speaker
   - Real-time Socket.io event handling via `useSocket` hook

2. **Socket Hook** (`src/hooks/useSocket.ts`)
   - Singleton Socket.io connection with auto-reconnect
   - Exposes typed event handlers: `onMatched`, `onQueued`, `onError`
   - Connection state: `isConnected`, `isConnecting`
   - Actions: `joinQueue`, `leaveQueue`
   - Proper cleanup via `off*` handlers

3. **Authentication** (`src/auth/`)
   - NextAuth v5 with Worldcoin MiniKit integration
   - Wallet-based auth using SIWE (Sign-In with Ethereum)
   - Session management for wallet addresses

4. **UI Components** (`src/components/ui/`)
   - shadcn/ui components with Tailwind styling
   - Radix UI primitives for accessibility
   - Framer Motion for animations

**Critical Implementation Details:**
- Must use `--legacy-peer-deps` when installing (React 19 peer dependency conflicts)
- Socket.io URL from `NEXT_PUBLIC_SOCKET_URL` env var
- Chat integration requires World App (MiniKit) installed
- Protected routes use Next.js middleware with NextAuth

## Redis Data Model

**Queues:**
- `queue:learner:{language}` - Redis list of learner UserData JSON
- `queue:fluent:{language}` - Redis list of fluent UserData JSON

**Active Users:**
- `active_users` - Redis set of userId strings

**Matches:**
- `match:{userId}` - Redis string (JSON MatchData) with 5min TTL

**Languages:**
Supported: Spanish (es), English (en), French (fr), Japanese (jp), German (de), Portuguese (pt), Italian (it), Mandarin (zh)

## Socket.io Events

**Client → Server:**
- `join_queue`: `{ role, language, userId?, username?, walletAddress? }`
- `leave_queue`: no payload
- `get_queue_status`: `{ role, language }`

**Server → Client:**
- `matched`: `{ partner: PartnerData, userId: string }`
- `queued`: `{ message: string, queueSize: number, userId: string }`
- `queue_status`: `{ queueSize: number, role: string, language: string }`
- `error`: `{ message: string }`
- `left_queue`: `{ message: string }`

## Testing the Matching System

1. Start Redis: `brew services start redis` (or equivalent)
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd my-first-mini-app && npm run dev`
4. Open http://localhost:3000 in two browser windows
5. Window 1: Select "Learner" → Spanish → Enter Queue
6. Window 2: Select "Fluent Guide" → Spanish → Enter Queue
7. Both should instantly show "It's a Match!"

## Common Issues

**Backend won't start:**
- Verify Redis: `redis-cli ping` → should return `PONG`
- Check port 4000: `lsof -i :4000`
- Check `.env` in backend dir

**Frontend can't connect:**
- Verify backend running on port 4000
- Check `NEXT_PUBLIC_SOCKET_URL` in `my-first-mini-app/.env.local`
- Check browser console for Socket.io errors

**TypeScript errors in backend:**
- All imports must use `.js` extension (ES modules)
- Use `tsx watch` for development (handles .ts → .js)

**Clear Redis queues:**
```bash
redis-cli FLUSHDB
```

## Environment Variables

**Backend** (`.env`):
- `PORT` - Server port (default: 4000)
- `REDIS_URL` - Redis connection (default: redis://localhost:6379)
- `CORS_ORIGIN` - Frontend origin (default: http://localhost:3000)
- `NODE_ENV` - Environment mode

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_SOCKET_URL` - Backend URL (e.g., http://localhost:4000)
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Frontend URL
- `HMAC_SECRET_KEY` - HMAC secret for nonce hashing

## Code Style Notes

- Backend uses ES modules with `.js` extensions in imports
- Frontend uses TypeScript with path aliases (`@/` → `src/`)
- Socket.io event types are shared between backend types and frontend hook
- Redis operations should be atomic where possible to prevent race conditions
- Always clean up Socket.io listeners to prevent memory leaks
