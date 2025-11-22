# Frontend Agents Documentation

This document outlines the frontend architecture, component patterns, and development agents for the LEXI Mini App.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Component Agents](#component-agents)
- [Authentication Agent](#authentication-agent)
- [State Management](#state-management)
- [UI Components](#ui-components)
- [Development Workflow](#development-workflow)

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.2.3 (App Router)
- **React**: 19.0.0
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS 4
- **UI Library**: @worldcoin/mini-apps-ui-kit-react
- **Authentication**: NextAuth.js v5 (Wallet Auth via MiniKit)
- **Wallet Integration**: @worldcoin/minikit-js

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (protected)/        # Protected routes
│   ├── api/                # API routes
│   └── layout.tsx          # Root layout
├── components/             # React components
├── auth/                   # Authentication logic
├── providers/              # React context providers
└── abi/                    # Contract ABIs
```

## Component Agents

### AuthButton Component
**Location**: `src/components/AuthButton/index.tsx`

**Purpose**: Handles wallet authentication flow using MiniKit.

**Key Features**:
- Uses `useMiniKit()` hook to detect MiniKit installation
- Implements auto-authentication when MiniKit is installed
- Provides user feedback via `LiveFeedback` component
- Manages pending state during authentication

**Pattern**:
```typescript
'use client'; // Required for MiniKit hooks
const { isInstalled } = useMiniKit();
// Auto-authenticate when installed
useEffect(() => {
  if (isInstalled && !isPending) {
    await walletAuth();
  }
}, [isInstalled, isPending]);
```

**Dependencies**:
- `@worldcoin/minikit-js/minikit-provider` - MiniKit context
- `@worldcoin/mini-apps-ui-kit-react` - UI components
- `@/auth/wallet` - Wallet authentication logic

### UserInfo Component
**Location**: `src/components/UserInfo/index.tsx`

**Purpose**: Displays authenticated user information.

**Data Source**: NextAuth session via `useSession()` hook

**Displays**:
- Profile picture (Marble component)
- Username
- Verification status (CheckCircle icon)

### Verify Component
**Location**: `src/components/Verify/index.tsx`

**Purpose**: World ID verification using MiniKit.

**Flow**:
1. User clicks verify button
2. MiniKit command executes (`MiniKit.commandsAsync.verify`)
3. Proof sent to `/api/verify-proof` for server-side verification
4. UI updates based on verification result

**Verification Levels**:
- `VerificationLevel.Device` - Device-level verification
- `VerificationLevel.Orb` - Orb-level verification

### Pay Component
**Location**: `src/components/Pay/index.tsx`

**Purpose**: Send ERC20 token payments via MiniKit.

**Features**:
- Supports multiple tokens (WLD, USDC, etc.)
- Includes reference ID for on-chain tracking
- Payment verification on server side

**Tokens Supported**:
- `Tokens.WLD` - Worldcoin token
- `Tokens.USDC` - USD Coin
- `Tokens.USDCE` - USD Coin (Ethereum)

### Transaction Component
**Location**: `src/components/Transaction/index.tsx`

**Purpose**: Execute smart contract transactions.

**Flow**:
1. Initiate transaction via MiniKit
2. Poll for transaction completion
3. Verify on-chain using Viem

**Dependencies**:
- `@worldcoin/minikit-react` - Transaction hooks
- `viem` - Ethereum interaction library

### ViewPermissions Component
**Location**: `src/components/ViewPermissions/index.tsx`

**Purpose**: Display user permissions granted to the app.

**Data Source**: `MiniKit.commandsAsync.getPermissions()`

## Authentication Agent

### Wallet Authentication Flow
**Location**: `src/auth/wallet/index.ts`

**Process**:
1. Generate nonce and signed nonce (server-side)
2. Request wallet signature via MiniKit
3. Verify signature and SIWE message
4. Create NextAuth session with user info

**Key Functions**:
- `walletAuth()` - Client-side authentication trigger
- `getNewNonces()` - Server-side nonce generation
- `hashNonce()` - HMAC-SHA256 nonce hashing

### NextAuth Configuration
**Location**: `src/auth/index.ts`

**Provider**: Credentials-based authentication
**Session Strategy**: JWT
**User Data**:
- `walletAddress` - User's wallet address
- `username` - World App username
- `profilePictureUrl` - Profile picture URL

### Protected Routes
**Location**: `src/app/(protected)/`

Routes wrapped in `(protected)` group require authentication via middleware.

## State Management

### Client-Side State
- **React Hooks**: `useState`, `useEffect`, `useCallback`
- **Session State**: NextAuth `useSession()` hook
- **MiniKit State**: `useMiniKit()` hook from provider

### Server-Side State
- **Session**: Retrieved via `auth()` function in server components
- **API Routes**: Handle server-side logic and verification

## UI Components

### Mini Apps UI Kit
**Library**: `@worldcoin/mini-apps-ui-kit-react`

**Components Used**:
- `Button` - Primary action buttons
- `LiveFeedback` - Loading/success/error states
- `Marble` - Profile picture display
- `CircularIcon` - Icon containers
- `ListItem` - List items for permissions

**Styling**: Follows World App design system guidelines

### Custom Components
- `PageLayout` - Page structure (Header, Main, Footer)
- `Navigation` - App navigation component

## Development Workflow

### Setup
1. Copy `.env.example` to `.env.local`
2. Configure environment variables:
   - `NEXTAUTH_SECRET` - Generate with `npx auth secret`
   - `HMAC_SECRET_KEY` - For nonce hashing
   - `AUTH_URL` - Your app URL (ngrok for development)
3. Run `npm run dev`
4. Set up ngrok: `ngrok http 3000`
5. Configure `allowedDevOrigins` in `next.config.ts`

### Development Tools
- **Eruda**: In-browser console (development only)
- **TypeScript**: Type checking
- **ESLint**: Code linting
- **Tailwind CSS**: Utility-first styling

### Best Practices

#### Client Components
- Always use `'use client'` directive for components using MiniKit
- Use `useCallback` for event handlers to prevent unnecessary re-renders
- Handle loading and error states appropriately

#### Server Components
- Use `auth()` function to get session in server components
- Keep server components free of client-side hooks

#### API Routes
- Always verify proofs/transactions on server side
- Use proper error handling and status codes
- Validate all inputs

#### MiniKit Integration
- Check `isInstalled` before calling MiniKit commands
- Handle command failures gracefully
- Provide user feedback for all async operations

### Testing Checklist
- [ ] Authentication flow works end-to-end
- [ ] Protected routes redirect when not authenticated
- [ ] MiniKit commands execute correctly
- [ ] Server-side verification works
- [ ] UI feedback displays correctly
- [ ] Error states are handled
- [ ] Loading states are shown

## Environment Variables

Required environment variables (`.env.local`):
```env
NEXTAUTH_SECRET=          # Generated secret
HMAC_SECRET_KEY=          # Secret for nonce hashing
AUTH_URL=                 # Your app URL
NEXTAUTH_URL=             # Same as AUTH_URL
```

## API Routes

### `/api/auth/[...nextauth]`
NextAuth.js authentication handler

### `/api/initiate-payment`
Creates payment reference ID

### `/api/verify-proof`
Server-side proof verification for World ID

## Common Patterns

### Component Pattern
```typescript
'use client';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useState, useCallback } from 'react';

export const MyComponent = () => {
  const { isInstalled } = useMiniKit();
  const [state, setState] = useState();
  
  const handleAction = useCallback(async () => {
    if (!isInstalled) return;
    // MiniKit command
  }, [isInstalled]);
  
  return <div>...</div>;
};
```

### Error Handling Pattern
```typescript
try {
  const result = await MiniKit.commandsAsync.someCommand();
  if (result.finalPayload.status === 'success') {
    // Handle success
  } else {
    // Handle failure
  }
} catch (error) {
  console.error('Error:', error);
  // Handle error
}
```

## Resources

- [Mini Apps Documentation](https://docs.worldcoin.org/mini-apps)
- [MiniKit JS](https://github.com/worldcoin/minikit-js)
- [Mini Apps UI Kit](https://github.com/worldcoin/mini-apps-ui-kit)
- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://authjs.dev)

