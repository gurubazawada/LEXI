# Update Total Chats Counter

## Problem
The "Total Chats" counter on the main match page is hardcoded to 0 because the frontend stats API is returning placeholder data.

## Solution
Update the Next.js API route (`/api/stats`) to fetch the actual lesson count from the Backend API (`/api/lessons/:userId`).

## Implementation Steps

### 1. Update Frontend Stats API
**File**: `my-first-mini-app/src/app/api/stats/route.ts`

Modify the `GET` handler to:
1.  Get the authenticated user's ID (wallet address).
2.  Fetch the user's lessons from the backend: `GET ${BACKEND_URL}/api/lessons/${userId}`.
3.  Calculate `totalChats` as `lessons.length`.
4.  Return this real count in the response.

## Details
- **Backend URL**: Will use `process.env.NEXT_PUBLIC_SOCKET_URL` (as it points to the backend base URL) or default to `http://localhost:4000`.
- **Error Handling**: If backend fetch fails, default `totalChats` to 0 but log the error.

## Example Code
```typescript
    const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const lessonsResponse = await fetch(`${backendUrl}/api/lessons/${session.user.walletAddress}`);
    let totalChats = 0;
    
    if (lessonsResponse.ok) {
      const data = await lessonsResponse.json();
      totalChats = data.lessons.length;
    }
```

