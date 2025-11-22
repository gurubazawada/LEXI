# Fix Redis Connection on Render

## The Problem
Your backend is trying to connect to `127.0.0.1:6379` (localhost), which means the `REDIS_URL` environment variable is not set on Render.

## Quick Fix Steps

### 1. Create Redis Service (if not already created)

1. In Render dashboard, click **"New +"** → **"Redis"**
2. Name it: `lex-redis`
3. Choose plan (Free tier works)
4. Click **"Create Redis"**
5. Wait 1-2 minutes for provisioning

### 2. Get Redis Connection String

1. Click on your **Redis service** (`lex-redis`)
2. In the **"Info"** tab, find **"Internal Redis URL"**
3. It will look like: `redis://red-xxxxx:6379`
4. **Copy this URL**

### 3. Set Environment Variable in Web Service

1. Go to your **Web Service** (your backend)
2. Click **"Environment"** tab
3. Click **"Add Environment Variable"**
4. Add:
   - **Key:** `REDIS_URL`
   - **Value:** Paste the Redis URL you copied (e.g., `redis://red-xxxxx:6379`)
5. Click **"Save Changes"**

### 4. Redeploy

1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**

OR push a new commit to trigger auto-deploy.

## Verify It Works

1. After deployment, go to **"Logs"** tab
2. You should see:
   ```
   🔗 Connecting to Redis: red-xxxxx:6379
   ✓ Connected to Redis
   🚀 Server running on port 4000
   ```

If you still see connection errors, check:
- ✅ Redis service status is "Live" (green)
- ✅ `REDIS_URL` is set in Web Service environment variables
- ✅ The URL format is correct (starts with `redis://`)

## Alternative: Using render.yaml

If you want to use infrastructure-as-code, create a `render.yaml` in your `backend/` directory:

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
        sync: false  # Set this manually in dashboard
      - key: NODE_ENV
        value: production

  - type: redis
    name: lex-redis
    plan: starter
```

Then deploy using Render's Blueprint feature.

