# Backend Test Suite

This repository includes a comprehensive test suite for the backend services, focusing on queue management and matching logic.

## Prerequisites

1.  **Node.js** (v18+)
2.  **Redis** running locally on port 6379 (or configured via `REDIS_URL`)

## Running Tests

To run the tests once:

```bash
npm test
```

To run tests in watch mode (re-runs on file save):

```bash
npm run test:watch
```

## Test Coverage

### QueueService (`src/__tests__/queue.service.test.ts`)
-   **Joining Queue**: Verifies users are added to the correct Redis lists.
-   **Strict Separation**: CRITICAL. Verifies that if a user switches languages (e.g., ES -> FR), they are *removed* from the old queue and *added* to the new one.
-   **Disconnect Cleanup**: Verifies that `removeUserFromAnyQueue` correctly cleans up the user's state.
-   **Atomic Matching**: Verifies `getNextFromQueue` retrieves and removes users correctly.

### MatchingService (`src/__tests__/matching.service.test.ts`)
-   **Basic Matching**: Verifies a learner matches with a fluent speaker.
-   **Unresponsive Users**: Verifies that if a partner is unresponsive (ping timeout), they are skipped and removed from the queue.
-   **Offline Users**: Verifies that if a partner's socket is missing, they are skipped.

## Troubleshooting

-   **Redis Connection Error**: Ensure `redis-server` is running. Check connection logs.
-   **Timeouts**: If tests fail with timeout, your Redis might be slow or unreachable.

