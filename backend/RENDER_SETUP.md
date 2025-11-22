# Render Deployment Setup Guide

## Fixing Redis Connection Error

The error `ECONNREFUSED 127.0.0.1:6379` means Redis URL is not configured correctly.

## Step-by-Step Setup

### 1. Create Redis Service

1. In your Render dashboard, click **"New +"** → **"Redis"**
2. Name it (e.g., `lex-redis`)
3. Choose a plan (Free tier works for development)
4. Click **"Create Redis"**
5. Wait for it to provision (takes 1-2 minutes)

### 2. Get Redis Connection String

1. Click on your Redis service
2. Go to the **"Info"** tab
3. Copy the **"Internal Redis URL"** - it looks like:
   ```
   redis://red-xxxxx:6379
   ```
   OR
   
   Copy the **"Redis URL"** (external) if you need it:
   ```
   redis://red-xxxxx:6379
   ```

### 3. Configure Your Web Service

1. Go to your **Web Service** (your backend)
2. Go to **"Environment"** tab
3. Add/Update these environment variables:

   | Key | Value |
   |-----|-------|
   | `REDIS_URL` | `redis://red-xxxxx:6379` (from step 2) |
   | `CORS_ORIGIN` | Your frontend URL (e.g., `https://your-app.vercel.app`) |
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` (Render sets this automatically, but good to have) |

4. Click **"Save Changes"**

### 4. Redeploy

1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**
   OR
   - Push a new commit to trigger auto-deploy

## Alternative: Using Render's Service Discovery

If you're using `render.yaml`, the Redis connection should be auto-injected. Make sure your `render.yaml` looks like this:

```yaml
services:
  - type: web
    name: lex-backend
    env: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    envVars:
      - key: REDIS_URL
        fromService:
          type: redis
          name: lex-redis
          property: connectionString
      - key: CORS_ORIGIN
        sync: false
```

## Verify Connection

After deployment, check the logs:

1. Go to your Web Service
2. Click **"Logs"** tab
3. You should see:
   ```
   ✓ Connected to Redis
   🚀 Server running on port 4000
   ```

If you still see connection errors, verify:
- Redis service is running (green status)
- `REDIS_URL` environment variable is set correctly
- The URL format is correct (should start with `redis://`)

## Common Issues

### Issue: Still connecting to localhost
**Solution:** Make sure `REDIS_URL` is set in the Web Service environment variables, not just in `render.yaml`

### Issue: Connection timeout
**Solution:** Use the **Internal Redis URL** (not external) if both services are in the same region

### Issue: Authentication error
**Solution:** Some Redis instances require a password. Check if your Redis URL includes authentication:
```
redis://:password@red-xxxxx:6379
```

