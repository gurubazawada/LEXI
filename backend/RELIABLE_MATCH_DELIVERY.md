# Reliable Match Delivery with Acknowledgments

## Problem
Users are experiencing "split brain" matches where one user gets the match notification but the other doesn't. This happens because the server sends the event but doesn't verify delivery. If a network packet is lost or the client is momentarily unreachable, the match enters an inconsistent state.

## Solution
Implement **Application-Level Acknowledgments (ACKs)** for match events. The server will wait for confirmation from *both* clients before considering the match final. If confirmation fails, the match is rolled back.

## Implementation Steps

### 1. Update Frontend Socket Hook
**File**: `my-first-mini-app/src/hooks/useSocket.ts`

Update `useSocket` to handle the `matched` event with an acknowledgment callback:
```typescript
    const handleMatched = (data: MatchedPayload, callback?: (response: any) => void) => {
      // 1. Acknowledge receipt immediately
      if (callback) {
        callback({ status: 'received' });
      }
      
      // 2. Process match as before
      console.log('Matched!', data);
      // ...
    };
```

### 2. Update Backend Socket Handlers
**File**: `backend/src/socket/handlers.ts`

Refactor the notification block to use `timeout()` and `emitWithAck` (or callback style):

```typescript
          try {
            // Define payloads
            const userPayload = { /* ... */ };
            const partnerPayload = { /* ... */ };

            // Store IDs (no change)
            partnerSocket.data.lessonId = lessonId;
            partnerSocket.data.partnerId = finalUserId;

            // Emit with 5000ms timeout and wait for ACKs
            // Use Promise.all to send in parallel
            await Promise.all([
              socket.timeout(5000).emitWithAck('matched', userPayload),
              partnerSocket.timeout(5000).emitWithAck('matched', partnerPayload)
            ]);

            console.log(`✓ Match confirmed by both parties: ...`);

          } catch (notificationError) {
            console.error('⚠️ Match delivery failed (ACK timeout). Rolling back...', notificationError);
            
            // 1. Rollback Redis state
            await matchingService.rollbackMatch(userData, match);
            
            // 2. Notify clients to cancel/reset (in case one received it)
            socket.emit('match_cancelled');
            partnerSocket.emit('match_cancelled');
            
            // 3. Send error/retry message
            socket.emit('error', { message: 'Match failed (network timeout). Please try again.' });
            partnerSocket.emit('error', { message: 'Match failed (network timeout). Please try again.' });
          }
```

### 3. Add `match_cancelled` Handler to Frontend
**File**: `my-first-mini-app/src/hooks/useSocket.ts` & `my-first-mini-app/src/app/match/page.tsx`

Handle the `match_cancelled` event to reset the UI from "Matched" back to "Queue" or "Idle" if a rollback occurs.

## Benefits
- **Guaranteed Sync**: Both users must confirm receipt for the match to stick.
- **Automatic Recovery**: If one user drops, the other is automatically reset and re-queued (via rollback logic).
- **No Hanging**: 5-second timeout prevents indefinite waiting.

## Breaking Change Warning
This requires **both** frontend and backend updates. If backend is deployed without frontend, all matches will fail (timeout). Deploy frontend first or simultaneously.

