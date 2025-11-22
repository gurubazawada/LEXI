# Setup Commands

Quick reference for setting up and running the LEX platform.

## Initial Setup

### 1. Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Verify Redis:**
```bash
redis-cli ping
# Should return: PONG
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

The default `.env` should work for local development:
```
PORT=4000
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### 4. Install Frontend Dependencies

```bash
cd my-first-mini-app
npm install --legacy-peer-deps
```

Note: Use `--legacy-peer-deps` due to React 19 compatibility.

### 5. Configure Frontend Environment

```bash
cd my-first-mini-app
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:4000" > .env.local
```

## Running the Application

You need **two terminal windows**:

### Terminal 1: Backend Server

```bash
cd backend
npm run dev
```

Expected output:
```
✓ Connected to Redis
🚀 Server running on port 4000
📡 Socket.io listening for connections
🌐 CORS enabled for: http://localhost:3000

✓ Ready to accept connections
```

### Terminal 2: Frontend Server

```bash
cd my-first-mini-app
npm run dev
```

Expected output:
```
  ▲ Next.js 15.2.3
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

✓ Ready in 2.3s
```

### Access the Application

Open your browser to: **http://localhost:3000**

## Testing

### Test Matching (2 Browser Windows)

**Window 1:**
1. Open http://localhost:3000
2. Select "Learner"
3. Choose "Spanish"
4. Click "Enter Queue"
5. You should see "Finding a partner..."

**Window 2:**
1. Open http://localhost:3000 (incognito or different browser)
2. Select "Fluent Guide"
3. Choose "Spanish"
4. Click "Enter Queue"
5. Both windows should show "It's a Match!" instantly

## Troubleshooting Commands

### Check if Redis is Running
```bash
redis-cli ping
```

### Check Redis Queue Data
```bash
# View all queue keys
redis-cli KEYS queue:*

# Check learner queue size for Spanish
redis-cli LLEN queue:learner:es

# Check fluent queue size for Spanish
redis-cli LLEN queue:fluent:es

# View all active matches
redis-cli KEYS match:*
```

### Clear All Queue Data
```bash
redis-cli FLUSHDB
```

### Check if Backend is Running
```bash
curl http://localhost:4000/health
```

Should return:
```json
{"status":"ok","timestamp":"2024-..."}
```

### Check if Port is in Use
```bash
# Check port 4000 (backend)
lsof -i :4000

# Check port 3000 (frontend)
lsof -i :3000
```

### View Backend Logs
Backend logs appear in the terminal where you ran `npm run dev`. Look for:
- Connection messages: `✓ Client connected: {socketId}`
- Queue joins: `User {username} joined {role} queue for {language}`
- Matches: `Match found! {user1} ↔ {user2}`
- Disconnections: `✗ Client disconnected: {socketId}`

### View Frontend Socket Connection
Open browser DevTools (F12) → Console. Look for:
- `✓ Connected to matching server`
- `Matched!` (when match found)
- `Queued:` (when added to queue)

## Production Build

### Build Backend
```bash
cd backend
npm run build
npm start
```

### Build Frontend
```bash
cd my-first-mini-app
npm run build
npm start
```

## Stopping the Application

### Stop Backend
Press `Ctrl+C` in the backend terminal

### Stop Frontend
Press `Ctrl+C` in the frontend terminal

### Stop Redis (if needed)
```bash
# macOS
brew services stop redis

# Linux
sudo systemctl stop redis
```

## Quick Reset

If things get stuck, reset everything:

```bash
# 1. Stop both servers (Ctrl+C in both terminals)

# 2. Clear Redis data
redis-cli FLUSHDB

# 3. Restart backend
cd backend
npm run dev

# 4. Restart frontend (in new terminal)
cd my-first-mini-app
npm run dev
```

## Common Issues

### "Cannot connect to matching server"
- Check if backend is running on port 4000
- Verify `NEXT_PUBLIC_SOCKET_URL` in frontend `.env.local`
- Check browser console for errors

### "Redis connection failed"
- Check if Redis is running: `redis-cli ping`
- Verify `REDIS_URL` in backend `.env`
- Try restarting Redis

### "Port already in use"
- Kill the process using the port:
  ```bash
  # For port 4000
  lsof -ti:4000 | xargs kill -9
  
  # For port 3000
  lsof -ti:3000 | xargs kill -9
  ```

### Matches not working
- Ensure both users select the **same language**
- Ensure users select **opposite roles** (one learner, one fluent)
- Check backend logs for matching attempts
- Verify Redis has data: `redis-cli KEYS queue:*`

## Environment Variables Reference

### Backend (.env)
| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4000 | Backend server port |
| REDIS_URL | redis://localhost:6379 | Redis connection URL |
| CORS_ORIGIN | http://localhost:3000 | Allowed frontend origin |
| NODE_ENV | development | Environment mode |

### Frontend (.env.local)
| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_SOCKET_URL | http://localhost:4000 | Backend Socket.io URL |
| NEXTAUTH_SECRET | - | NextAuth secret (optional for testing) |
| NEXTAUTH_URL | http://localhost:3000 | Frontend URL (optional) |
| HMAC_SECRET_KEY | - | HMAC secret (optional for testing) |

## Next Steps

After successful setup:
1. Test the matching system with two browser windows
2. Review the code in `backend/src/` to understand the matching logic
3. Check `MIGRATION_GUIDE.md` for architecture details
4. Customize the UI in `my-first-mini-app/src/app/page.tsx`
5. Add authentication integration with Worldcoin

