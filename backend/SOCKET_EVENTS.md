# Socket.io Events Reference

Quick reference for all Socket.io events in the LEX matching system.

## Client → Server Events

### `join_queue`
User requests to join the matching queue.

**Payload:**
```typescript
{
  role: 'learner' | 'fluent',
  language: string,           // Language code: 'es', 'en', 'fr', etc.
  userId?: string,            // Optional: user ID (generated if not provided)
  username?: string,          // Optional: display name (defaults to 'Anonymous')
  walletAddress?: string      // Optional: Worldcoin wallet address
}
```

**Example:**
```typescript
socket.emit('join_queue', {
  role: 'learner',
  language: 'es',
  userId: 'user123',
  username: 'John Doe',
  walletAddress: '0x1234...'
});
```

**Server Response:**
- Emits `matched` if immediate match found
- Emits `queued` if added to queue
- Emits `error` if validation fails

---

### `leave_queue`
User requests to leave the queue.

**Payload:** None

**Example:**
```typescript
socket.emit('leave_queue');
```

**Server Response:**
- Emits `left_queue` on success
- Removes user from queue and active users

---

### `get_queue_status`
Request current queue size for a role/language combination.

**Payload:**
```typescript
{
  role: 'learner' | 'fluent',
  language: string
}
```

**Example:**
```typescript
socket.emit('get_queue_status', {
  role: 'learner',
  language: 'es'
});
```

**Server Response:**
- Emits `queue_status` with queue size

---

## Server → Client Events

### `matched`
Match found! Both users receive this event.

**Payload:**
```typescript
{
  partner: {
    username: string,
    walletAddress?: string,
    language: string,
    role: 'learner' | 'fluent'
  },
  userId: string              // Your user ID
}
```

**Example:**
```typescript
socket.on('matched', (data) => {
  console.log('Matched with:', data.partner.username);
  console.log('Partner role:', data.partner.role);
  console.log('Language:', data.partner.language);
  // Show match UI
});
```

---

### `queued`
Successfully added to queue, waiting for match.

**Payload:**
```typescript
{
  message: string,            // Status message
  queueSize: number,          // Current queue size
  userId: string              // Your user ID
}
```

**Example:**
```typescript
socket.on('queued', (data) => {
  console.log(data.message);  // "Added to queue. Waiting for a partner..."
  console.log('Queue size:', data.queueSize);
  // Show waiting UI
});
```

---

### `left_queue`
Successfully left the queue.

**Payload:**
```typescript
{
  message: string             // Confirmation message
}
```

**Example:**
```typescript
socket.on('left_queue', (data) => {
  console.log(data.message);  // "Successfully left the queue"
  // Return to idle state
});
```

---

### `queue_status`
Response to `get_queue_status` request.

**Payload:**
```typescript
{
  queueSize: number,
  role: 'learner' | 'fluent',
  language: string
}
```

**Example:**
```typescript
socket.on('queue_status', (data) => {
  console.log(`${data.role} queue for ${data.language}: ${data.queueSize} users`);
});
```

---

### `error`
Error occurred during operation.

**Payload:**
```typescript
{
  message: string             // Error description
}
```

**Example:**
```typescript
socket.on('error', (data) => {
  console.error('Error:', data.message);
  // Show error UI
});
```

**Common Errors:**
- "Missing required fields: role and language"
- "Failed to join queue"
- "Failed to leave queue"
- "Failed to get queue status"

---

## Connection Events

### `connect`
Successfully connected to server.

**Payload:** None

**Example:**
```typescript
socket.on('connect', () => {
  console.log('Connected to server');
  console.log('Socket ID:', socket.id);
});
```

---

### `disconnect`
Disconnected from server.

**Payload:** Disconnect reason (string)

**Example:**
```typescript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Reasons: 'transport close', 'ping timeout', etc.
});
```

**Note:** User is automatically removed from queue on disconnect.

---

### `connect_error`
Connection error occurred.

**Payload:** Error object

**Example:**
```typescript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

---

## Complete Flow Example

### Learner Flow
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

// 1. Wait for connection
socket.on('connect', () => {
  console.log('Connected!');
  
  // 2. Join queue
  socket.emit('join_queue', {
    role: 'learner',
    language: 'es',
    username: 'Alice'
  });
});

// 3. Handle queued state
socket.on('queued', (data) => {
  console.log('Waiting for match...', data.queueSize, 'in queue');
});

// 4. Handle match
socket.on('matched', (data) => {
  console.log('Matched with', data.partner.username);
  console.log('Partner is a', data.partner.role);
  // Start chat with partner
});

// 5. Handle errors
socket.on('error', (data) => {
  console.error('Error:', data.message);
});

// 6. Leave queue (when user clicks cancel)
function cancelQueue() {
  socket.emit('leave_queue');
}

// 7. Cleanup on unmount
socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

---

## Testing with Socket.io Client

### Install Socket.io Client CLI
```bash
npm install -g socket.io-client
```

### Test Connection
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Join as learner
  socket.emit('join_queue', {
    role: 'learner',
    language: 'es',
    username: 'TestUser'
  });
});

socket.on('queued', (data) => {
  console.log('Queued:', data);
});

socket.on('matched', (data) => {
  console.log('Matched:', data);
});
```

---

## Event Flow Diagram

```
Client A (Learner)          Server              Client B (Fluent)
      |                       |                        |
      |----join_queue-------->|                        |
      |                       |                        |
      |<-----queued-----------|                        |
      |                       |                        |
      |                       |<----join_queue---------|
      |                       |                        |
      |<-----matched----------|-----matched----------->|
      |                       |                        |
```

---

## Error Handling Best Practices

```typescript
// Always handle connection errors
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
  // Show "Unable to connect" UI
});

// Handle disconnections gracefully
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected, try to reconnect
    socket.connect();
  }
  // Other reasons: client disconnected, show reconnecting UI
});

// Handle operation errors
socket.on('error', (data) => {
  console.error('Operation error:', data.message);
  // Show error message to user
});

// Timeout for operations
const timeout = setTimeout(() => {
  console.error('Operation timed out');
  // Handle timeout
}, 10000);

socket.on('matched', (data) => {
  clearTimeout(timeout);
  // Handle match
});
```

---

## Socket.io Configuration

### Client Options
```typescript
const socket = io('http://localhost:4000', {
  autoConnect: true,          // Auto-connect on creation
  reconnection: true,         // Enable reconnection
  reconnectionDelay: 1000,    // Wait 1s before reconnecting
  reconnectionAttempts: 5,    // Try 5 times
  timeout: 10000,             // Connection timeout
});
```

### Server Options
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,         // 60s ping timeout
  pingInterval: 25000,        // Ping every 25s
});
```

---

## Debugging

### Enable Debug Logs (Client)
```typescript
localStorage.debug = 'socket.io-client:*';
```

### Enable Debug Logs (Server)
```bash
DEBUG=socket.io:* npm run dev
```

### Monitor Events
```typescript
// Log all incoming events
socket.onAny((event, ...args) => {
  console.log('Received:', event, args);
});

// Log all outgoing events
socket.onAnyOutgoing((event, ...args) => {
  console.log('Sent:', event, args);
});
```

