# Notification Service

This service sends daily push notifications to users who have opted in to notifications.

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
WORLDCOIN_APP_ID=app_xxxxxxxxxxxxx  # Your Worldcoin Mini App ID
MINI_APP_PATH=worldapp://mini-app?app_id=app_xxxxxxxxxxxxx&path=/  # Deep link path
WORLDCOIN_API_KEY=your_api_key_here  # Optional, if API requires authentication
```

### 2. Install Dependencies

```bash
npm install
```

This will install `node-cron` for scheduling.

## Running the Notification Scheduler

### Development

Run the scheduler separately:

```bash
npm run notifications:scheduler
```

### Production

Run the scheduler as a separate process or service. You can:

1. **Run as a separate process:**
   ```bash
   npm run notifications:scheduler
   ```

2. **Use PM2:**
   ```bash
   pm2 start npm --name "lex-notifications" -- run notifications:scheduler
   ```

3. **Use Docker Compose:**
   Add a separate service in `docker-compose.yml`:
   ```yaml
   notification-scheduler:
     build: .
     command: npm run notifications:scheduler
     environment:
       - REDIS_URL=redis://redis:6379
       - WORLDCOIN_APP_ID=${WORLDCOIN_APP_ID}
       - MINI_APP_PATH=${MINI_APP_PATH}
       - WORLDCOIN_API_KEY=${WORLDCOIN_API_KEY}
     depends_on:
       - redis
   ```

## Schedule

Notifications are sent **every day at 10:00 AM** (server time).

The cron expression is: `0 10 * * *`

To change the schedule, edit `backend/src/scripts/scheduled-notifications.ts`.

## API Endpoints

### Enable Notifications
```bash
POST /api/notifications/enable
Body: { "walletAddress": "0x..." }
```

### Disable Notifications
```bash
POST /api/notifications/disable
Body: { "walletAddress": "0x..." }
```

### Check Notification Status
```bash
GET /api/notifications/status/:walletAddress
```

## How It Works

1. **User grants permission**: When a user grants notification permission in the app, their wallet address is stored in Redis.

2. **Daily job**: The scheduler runs every day at 10 AM and:
   - Fetches all users with notifications enabled from Redis
   - Sends notifications via Worldcoin API
   - Logs results

3. **Notification content**: Currently sends a dummy message:
   - Title: "🌍 Daily Language Practice"
   - Message: "Hello ${username}! Ready for some language practice today? Find a partner and start chatting!"

## Testing

To test immediately (without waiting for 10 AM), uncomment this line in `scheduled-notifications.ts`:

```typescript
sendDailyNotifications(APP_ID, MINI_APP_PATH, WORLDCOIN_API_KEY).catch(console.error);
```

Then run:
```bash
npm run notifications:scheduler
```

## Monitoring

Check logs for:
- `📅 Running scheduled daily notifications` - Job started
- `📧 Sending daily notifications to X users` - Processing
- `✓ Daily notifications sent successfully` - Success
- `✗ Some notifications failed` - Partial failure

## Troubleshooting

- **No users receiving notifications**: Check Redis for `notifications:enabled` set
- **API errors**: Verify `WORLDCOIN_APP_ID` and `WORLDCOIN_API_KEY` are correct
- **Scheduler not running**: Check if the process is running and Redis is connected

