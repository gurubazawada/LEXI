# Session Persistence Fix

## Problem
Users were being asked to sign in every time they opened the app, even after clicking "Keep me signed in for future sessions" during wallet authentication.

## Root Causes

### 1. Auto-Authentication on Every Mount
The `AuthButton` component had a `useEffect` that automatically triggered authentication whenever the component mounted and `isInstalled` was true. This meant:
- Even if the user had a valid session, the component would try to re-authenticate
- This created an infinite loop of authentication requests
- The session was never actually checked before triggering auth

### 2. Missing Session Configuration
The NextAuth configuration was missing important session settings:
- No explicit `maxAge` for JWT tokens (defaulted to shorter duration)
- No explicit cookie configuration for session persistence
- Cookies might not have been properly configured for the environment

## Fixes Applied

### 1. Removed Auto-Authentication (`/components/AuthButton/index.tsx`)

**Before:**
```typescript
useEffect(() => {
  const authenticate = async () => {
    if (isInstalled && !isPending) {
      setIsPending(true);
      try {
        await walletAuth();
      } catch (err) {
        console.error('Auto wallet authentication error', err);
      } finally {
        setIsPending(false);
      }
    }
  };

  authenticate();
}, [isInstalled, isPending]);
```

**After:**
```typescript
// Removed the useEffect entirely
// Added useSession to check if user is already authenticated
const { data: session } = useSession();
```

**Why:** The button should only trigger authentication when the user explicitly clicks it, not automatically on mount. The landing page already handles redirecting authenticated users.

### 2. Extended Session Duration (`/auth/index.ts`)

**Added:**
```typescript
session: { 
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days
},
```

**Why:** This ensures JWT tokens remain valid for 30 days, matching the `expirationTime` set in the wallet auth command (7 days in the SIWE message, but we extend it to 30 days for the session).

### 3. Explicit Cookie Configuration (`/auth/index.ts`)

**Added:**
```typescript
cookies: {
  sessionToken: {
    name: `next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
},
```

**Why:** 
- `httpOnly: true` - Prevents JavaScript access to the cookie (security)
- `sameSite: 'lax'` - Allows cookies to be sent with top-level navigations
- `path: '/'` - Makes cookie available across the entire app
- `secure: production only` - Uses secure cookies in production, allows http in development

## How It Works Now

1. **First Visit:**
   - User lands on `/` (landing page)
   - No session exists
   - Landing page shows "Connect Wallet" button
   - User clicks button → wallet auth flow → session created
   - Session cookie stored with 30-day expiration
   - User redirected to `/match`

2. **Return Visit (within 30 days):**
   - User lands on `/` (landing page)
   - `useSession()` detects valid session from cookie
   - Landing page automatically redirects to `/match`
   - No authentication required

3. **Session Expiration (after 30 days):**
   - Session cookie expires
   - User lands on `/` (landing page)
   - No valid session
   - User must authenticate again

## Testing

To verify the fix works:

1. **Clear existing sessions:**
   ```bash
   # In browser DevTools > Application > Cookies
   # Delete all cookies for your domain
   ```

2. **Test authentication:**
   - Open app
   - Click "Connect Wallet"
   - Complete authentication
   - Should redirect to `/match`

3. **Test persistence:**
   - Close the app completely
   - Reopen the app
   - Should automatically redirect to `/match` without asking for authentication

4. **Test session validity:**
   - Check browser cookies (DevTools > Application > Cookies)
   - Should see `next-auth.session-token` cookie
   - Cookie should have an expiration date ~30 days in the future

## Additional Notes

- The wallet auth SIWE message still has a 7-day expiration, but the NextAuth session extends this to 30 days
- If you want to match the SIWE expiration, change `maxAge` to `7 * 24 * 60 * 60`
- Sessions are stored as JWT tokens in cookies, not in a database
- The `redirect: false` in `walletAuth()` allows client-side navigation instead of full page reloads

## Environment Variables Required

Make sure these are set in `.env.local`:
```
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000  # or your production URL
```

Generate a new secret with:
```bash
npx auth secret
```

