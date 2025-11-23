# Strict Queue Separation - Implementation Summary

## Overview
This document details the refactoring of the queue system to strictly enforce single-queue membership and prevent cross-language matching issues.

## Problem Solved
Previously, users could accidentally remain in a queue for one language (e.g., Spanish) while joining another (e.g., French). This happened because:
1. The system only tracked *if* a user was in a queue (via `active_users` set), but not *which* queue.
2. Cleanup logic attempted to remove users from the *new* queue they were joining, not the *old* one they were leaving.
3. `removeUserFromAllQueues` iterated through a hardcoded list of languages, missing any that weren't in the list and performing inefficiently.

This led to users being matched with partners in different languages and "ghost" users lingering in queues.

## Solution: Explicit User-Queue Mapping

We introduced a new Redis key pattern to track exactly where each user is.

### New Redis Key Structure
- **`user:queue:{userId}`**: Stores the string `"{role}:{language}"` (e.g., `"learner:es"`).
  - Acts as the "source of truth" for a user's queue status.
  - Enables O(1) lookup of a user's queue.

### Key Changes

#### 1. QueueService (`backend/src/services/queue.service.ts`)
- **`joinQueue`**:
  - First checks `user:queue:{userId}`.
  - If it exists, removes the user from *that specific old queue*.
  - Then adds to the new queue and updates the mapping.
  - This guarantees a user is never in two queues at once.

- **`removeUserFromAnyQueue` (formerly `removeUserFromAllQueues`)**:
  - Looks up `user:queue:{userId}`.
  - Removes user from that specific queue.
  - Deletes the mapping.
  - No more looping through all possible queues.

- **`getNextFromQueue`**:
  - When a user is matched (popped), their `user:queue:{userId}` mapping is deleted.

#### 2. Socket Handlers (`backend/src/socket/handlers.ts`)
- **`join_queue`**:
  - Removed manual cleanup logic.
  - Relies on `queueService.joinQueue` to automatically handle "switch queue" scenarios.
  - Added a final `removeUserFromAnyQueue` call after a successful match to ensure no lingering state.

## Benefits

### ✅ strict Isolation
It is now impossible for a user to be in the Spanish queue and the French queue simultaneously. Joining one automatically leaves the other.

### ✅ Performance
Cleanup operations are now O(1) (constant time) instead of O(N*M) (checking every language/role combination).

### ✅ Reliability
The system no longer depends on a hardcoded list of languages in the cleanup function. New languages work automatically without code changes.

## Testing

### Scenario: Switching Languages
1. User joins **Spanish** queue.
   - Redis: `queue:learner:es` has UserID.
   - Redis: `user:queue:{userId}` = `"learner:es"`.
2. User joins **French** queue.
   - `joinQueue` detects `"learner:es"` in mapping.
   - Removes UserID from `queue:learner:es`.
   - Adds UserID to `queue:learner:fr`.
   - Updates `user:queue:{userId}` = `"learner:fr"`.
3. **Result**: User is ONLY in French queue. No cross-matching possible.

### Scenario: Disconnect
1. User disconnects.
2. Handler calls `removeUserFromAnyQueue`.
3. Service looks up `user:queue:{userId}`.
4. Removes user from that specific queue.
5. Deletes mapping.
6. **Result**: Clean removal, no lingering ghost user.

