# Queue Fixes - Testing Guide

## Quick Test Commands

### Test 1: Basic Matching (No Vulnerabilities)
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Monitor Redis
redis-cli MONITOR

# Terminal 3: Test with curl or use frontend
# Join as learner
curl -X POST http://localhost:4000/test/join \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","username":"Alice","role":"learner","language":"es"}'

# Join as fluent (should match immediately)
curl -X POST http://localhost:4000/test/join \
  -H "Content-Type: application/json" \
  -d '{"userId":"user2","username":"Bob","role":"fluent","language":"es"}'
```

### Test 2: Disconnect Grace Period
```bash
# 1. Join queue with frontend
# 2. Close browser/app
# 3. Check logs - should see "starting 10s grace period"
# 4. Reopen within 10 seconds
# 5. Should see "grace period cancelled" and keep queue position
```

### Test 3: Socket Validation
```bash
# This test requires simulating a disconnected user in queue
# 1. User A joins queue
# 2. User A disconnects (but data still in Redis due to timing)
# 3. User B joins queue and tries to match with A
# 4. Should see "Partner has no active socket. Skipping..."
# 5. User B should remain in queue, not get stuck
```

### Test 3b: Ping Validation (Unresponsive User)
```bash
# This test verifies that unresponsive users are skipped
# 1. User A joins queue
# 2. Simulate User A freezing (don't respond to ping)
#    - Can be simulated by commenting out pong handler temporarily
# 3. User B joins queue and tries to match with A
# 4. Should see "Pinging partner..." then "did not respond to ping within 2s"
# 5. User A should be removed from queue
# 6. User B should remain in queue
```

### Test 4: Match Rollback
```bash
# This test requires simulating a match notification failure
# 1. Two users match successfully
# 2. Simulate socket disconnection during notification
# 3. Should see "Rolling back failed match"
# 4. Both users should be re-added to queue
```

## Manual Testing Checklist

### ✅ Scenario 1: Normal Matching
- [ ] Two users join different roles, same language
- [ ] Both receive match notification
- [ ] Both can communicate via WebRTC
- [ ] No errors in logs

### ✅ Scenario 2: Disconnect and Reconnect (< 10s)
- [ ] User joins queue
- [ ] User disconnects
- [ ] Log shows "starting 10s grace period"
- [ ] User reconnects within 10 seconds
- [ ] Log shows "grace period cancelled"
- [ ] User still in queue (check Redis: `SMEMBERS active_users`)
- [ ] User can be matched

### ✅ Scenario 3: Disconnect and Stay Gone (> 10s)
- [ ] User joins queue
- [ ] User disconnects
- [ ] Log shows "starting 10s grace period"
- [ ] Wait 10+ seconds
- [ ] Log shows "Grace period expired: Removed {userId} from queue"
- [ ] User not in queue (check Redis: `SMEMBERS active_users`)

### ✅ Scenario 4: Partner Disconnects Before Match
- [ ] User A joins learner queue
- [ ] User B joins fluent queue (should match)
- [ ] User B disconnects immediately
- [ ] User C joins learner queue
- [ ] User C should match with User A (skip User B)
- [ ] No users stuck in limbo

### ✅ Scenario 4b: Partner Unresponsive (Ping Timeout)
- [ ] User A joins learner queue
- [ ] User B joins fluent queue
- [ ] User B's app freezes (doesn't respond to ping)
- [ ] Log shows "Pinging partner B..."
- [ ] Log shows "did not respond to ping within 2s"
- [ ] User B removed from queue
- [ ] User A remains in queue
- [ ] User C joins fluent queue
- [ ] User A matches with User C successfully

### ✅ Scenario 5: Rapid Reconnections
- [ ] User connects
- [ ] User disconnects
- [ ] User reconnects (repeat 5 times quickly)
- [ ] No memory leaks
- [ ] Timer properly cancelled each time
- [ ] User maintains queue position

### ✅ Scenario 6: Multiple Users Same Queue
- [ ] 5 learners join Spanish queue
- [ ] 5 fluents join Spanish queue
- [ ] All should match correctly
- [ ] No duplicate matches
- [ ] No users left unmatched

## Redis Inspection Commands

### Check Queue Contents
```bash
# View learner queue for Spanish
redis-cli LRANGE queue:learner:es 0 -1

# View fluent queue for Spanish
redis-cli LRANGE queue:fluent:es 0 -1

# Check active users
redis-cli SMEMBERS active_users

# Check specific user's socket
redis-cli GET user_socket:user123

# Check specific user's match
redis-cli GET match:user123
```

### Monitor Real-Time
```bash
# Watch all Redis commands
redis-cli MONITOR

# Watch specific keys
redis-cli --scan --pattern "queue:*"
redis-cli --scan --pattern "user_socket:*"
redis-cli --scan --pattern "match:*"
```

## Expected Log Output

### Successful Match (With Ping Validation)
```
✓ Client connected: abc123
User Alice (user1) joined learner queue for es
✓ Client connected: def456
🏓 Pinging partner Alice to verify responsiveness...
✓ Valid and responsive match found! Bob (fluent) ↔ Alice (learner)
✓ Match completed: Bob ↔ Alice (Lesson: lesson123)
```

### Disconnect with Grace Period
```
⏳ Client disconnected: abc123 (User: user1) - starting 10s grace period
✓ Client connected: abc123
✓ Reconnection detected for user user1 - grace period cancelled
```

### Socket Validation Skip
```
⚠️ Partner Alice has no active socket. Skipping and trying next in queue (attempt 1/5)
🏓 Pinging partner Bob to verify responsiveness...
✓ Valid and responsive match found! Charlie (learner) ↔ Bob (fluent)
```

### Ping Validation Timeout
```
🏓 Pinging partner Alice to verify responsiveness...
⚠️ Partner Alice did not respond to ping within 2s. Skipping and trying next in queue (attempt 1/5)
🏓 Pinging partner Bob to verify responsiveness...
✓ Valid and responsive match found! Charlie (learner) ↔ Bob (fluent)
```

### Match Rollback
```
⚠️ Partner socket def456 not found after match! Rolling back...
🔄 Rolling back failed match: Alice ↔ Bob
✓ Rollback complete: Both users re-added to queue
```

## Performance Testing

### Load Test: 100 Concurrent Users
```bash
# Install artillery if not installed
npm install -g artillery

# Create artillery config
cat > load-test.yml << EOF
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Join Queue"
    engine: socketio
    flow:
      - emit:
          channel: "join_queue"
          data:
            role: "learner"
            language: "es"
            userId: "{{ \$uuid }}"
            username: "User{{ \$uuid }}"
      - think: 5
EOF

# Run load test
artillery run load-test.yml
```

### Expected Results
- No memory leaks
- All users matched or queued
- No stuck users
- Timers properly cleaned up

## Debugging Tips

### If Users Get Stuck
1. Check Redis: `redis-cli SMEMBERS active_users`
2. Check if socket exists: `redis-cli GET user_socket:{userId}`
3. Check backend logs for rollback messages
4. Verify match data: `redis-cli GET match:{userId}`

### If Matches Fail
1. Check socket validation logs
2. Verify both sockets exist in `io.sockets.sockets`
3. Check for rollback messages
4. Verify both users receive error events

### If Grace Period Doesn't Work
1. Check `disconnectTimers` Map in memory
2. Verify timer is set on disconnect
3. Verify timer is cancelled on reconnect
4. Check for timer cleanup after expiration

## Success Criteria

All fixes are working correctly if:
- ✅ No users stuck in queue after disconnect
- ✅ Reconnections within 10s preserve queue position
- ✅ Failed matches automatically rollback
- ✅ Offline partners are skipped during matching
- ✅ **Unresponsive partners are skipped during matching (ping timeout)**
- ✅ **Only responsive users are matched (ping-pong validation)**
- ✅ No stale socket ID errors
- ✅ No memory leaks from timers
- ✅ All matches complete successfully or rollback cleanly

## Rollback Plan

If issues arise, revert these commits:
1. Types: Make socketId optional
2. Queue Service: Remove socketId stripping
3. Matching Service: Remove socket validation & rollback
4. Socket Handlers: Remove grace period & rollback logic

Or use git:
```bash
git revert HEAD~4..HEAD
```

