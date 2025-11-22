# WebRTC Voice Call Feature Guide

## Overview

The LEX platform now supports peer-to-peer voice calling between matched language partners using WebRTC technology. When two users are matched, they can start a voice call directly in the browser without any additional software.

## Features

✅ **Peer-to-peer audio** - Direct connection between users (not routed through server)
✅ **Real-time signaling** - Uses existing Socket.io infrastructure
✅ **Encrypted audio** - WebRTC uses DTLS-SRTP encryption by default
✅ **Microphone controls** - Mute/unmute during call
✅ **Call timer** - Shows call duration
✅ **Incoming call UI** - Accept/reject incoming calls
✅ **Connection status** - Shows calling/connecting/active states
✅ **Error handling** - Handles permission denials, connection failures

## How It Works

### Architecture

```
User A                    Backend (Signaling)              User B
  |                              |                            |
  |-- getUserMedia() -------->  |                            |
  |   (Request microphone)       |                            |
  |                              |                            |
  |-- call_initiate ----------> |                            |
  |                              |-- call_incoming ---------> |
  |                              |                            |
  |                              | <-- call_accept ---------- |
  | <-- call_accepted ---------- |                            |
  |                              |                            |
  |-- webrtc_offer -----------> |-- webrtc_offer ----------> |
  |                              |                            |
  | <-- webrtc_answer ---------- | <-- webrtc_answer -------- |
  |                              |                            |
  |-- ice_candidate ----------> |-- ice_candidate ---------> |
  | <-- ice_candidate ---------- | <-- ice_candidate -------- |
  |                              |                            |
  |<========== P2P Audio Connection =======================>|
```

### Components

1. **Backend Signaling** (`backend/src/socket/handlers.ts`)
   - Handles call initiation, acceptance, rejection
   - Forwards WebRTC offers, answers, and ICE candidates
   - Tracks user socket IDs in Redis

2. **WebRTC Hook** (`my-first-mini-app/src/hooks/useWebRTC.ts`)
   - Manages RTCPeerConnection
   - Handles microphone access
   - Creates/processes WebRTC offers and answers
   - Manages ICE candidate exchange

3. **Voice Call UI** (`my-first-mini-app/src/components/VoiceCall/index.tsx`)
   - "Start Voice Call" button
   - Incoming call modal (Accept/Reject)
   - Active call modal (Mute/End Call)
   - Call timer and status indicators

## Testing Instructions

### Prerequisites

1. **Backend running** with Redis:
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend running**:
   ```bash
   cd my-first-mini-app
   npm run dev
   ```

3. **HTTPS or localhost** - WebRTC requires secure context
   - localhost works fine for testing
   - For mobile testing, use ngrok with HTTPS

### Test Scenario 1: Local Testing (Two Browser Windows)

1. **Open two browser windows** (or use incognito mode for second window)

2. **Window 1 - User A:**
   - Go to http://localhost:3000
   - Select "Learner" + "Spanish"
   - Click "Enter Queue"
   - Wait for match

3. **Window 2 - User B:**
   - Go to http://localhost:3000 (incognito)
   - Select "Fluent Guide" + "Spanish"
   - Click "Enter Queue"
   - Both should match instantly

4. **Start Voice Call:**
   - In Window 1, click "Start Voice Call"
   - Browser will request microphone permission - **ALLOW**
   - Window 2 will show "Incoming Call" modal
   - In Window 2, click "Accept"
   - Browser will request microphone permission - **ALLOW**
   - Both windows should show "Voice Call Active"

5. **During Call:**
   - Speak in one window, hear in the other
   - Try muting/unmuting
   - Watch the call timer
   - Check connection status

6. **End Call:**
   - Click "End Call" in either window
   - Both should return to matched screen

### Test Scenario 2: Mobile Testing (ngrok)

1. **Setup ngrok for backend:**
   ```bash
   ngrok http 4000
   ```
   Note the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

2. **Update frontend `.env.local`:**
   ```
   NEXT_PUBLIC_SOCKET_URL=https://abc123.ngrok-free.app
   ```

3. **Restart frontend:**
   ```bash
   cd my-first-mini-app
   npm run dev
   ```

4. **Access on mobile:**
   - Desktop: http://localhost:3000
   - Mobile: http://YOUR_COMPUTER_IP:3000
   - Or use ngrok for frontend too

5. **Test call between desktop and mobile:**
   - Match users on both devices
   - Initiate call from one device
   - Accept on the other
   - Verify audio works both ways

### Test Scenario 3: Edge Cases

**Test Permission Denied:**
1. Start a call
2. When browser asks for microphone, click "Block"
3. Should show error message
4. Refresh page and try again with "Allow"

**Test Call Rejection:**
1. User A starts call
2. User B clicks "Reject"
3. User A should see "Call was rejected" message

**Test Call Cancellation:**
1. User A starts call
2. Before User B accepts, User A clicks "Cancel"
3. User B should see call disappear

**Test Disconnection During Call:**
1. Start active call between two users
2. Close one browser window
3. Other user should see "Connection lost" or call ends

**Test Multiple Call Attempts:**
1. Start and end a call
2. Start another call immediately
3. Should work without issues

## Browser Console Logs

During a successful call, you should see these logs:

**Caller (User A):**
```
🔌 Socket.io Backend URL: http://localhost:4000
✓ Connected to matching server: http://localhost:4000
Matched! {...}
🔧 Initializing peer connection
🎤 Requesting microphone access
📞 Call initiated to partner: user-id
✓ Call accepted by partner
📡 WebRTC offer sent
🧊 Sending ICE candidate
📡 Received WebRTC answer
✓ Remote description set
🧊 Received ICE candidate
🔗 Connection state: connected
```

**Callee (User B):**
```
🔌 Socket.io Backend URL: http://localhost:4000
✓ Connected to matching server: http://localhost:4000
Matched! {...}
📞 Incoming call from: User A
🔧 Initializing peer connection
🎤 Requesting microphone access
✓ Call accepted from: user-id
📡 Received WebRTC offer
📡 WebRTC answer sent
🧊 Sending ICE candidate
🧊 Received ICE candidate
🎵 Received remote audio track
🔗 Connection state: connected
```

## Troubleshooting

### No Audio

**Problem:** Can't hear partner's audio

**Solutions:**
- Check browser console for errors
- Verify microphone permissions are granted
- Check system audio settings (not muted)
- Try refreshing and starting call again
- Check if audio element is playing (should auto-play)

### Microphone Permission Denied

**Problem:** Browser blocks microphone access

**Solutions:**
- Click the lock icon in address bar
- Allow microphone access
- Refresh the page
- Try in a different browser

### Connection Failed

**Problem:** Call shows "Connecting..." but never connects

**Solutions:**
- Check both users have granted microphone permission
- Verify backend is running and accessible
- Check browser console for WebRTC errors
- Try with different STUN servers (edit `useWebRTC.ts`)
- May need TURN server for restrictive networks

### Call Ends Immediately

**Problem:** Call connects but ends right away

**Solutions:**
- Check for JavaScript errors in console
- Verify both users stay on the page
- Check network connectivity
- Try different browser

### Partner Not Found Error

**Problem:** "Partner not found or offline" when starting call

**Solutions:**
- Verify both users are still matched
- Check backend logs for socket tracking
- Ensure Redis is running
- Try leaving and re-matching

## Technical Details

### WebRTC Configuration

**STUN Servers:**
```typescript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};
```

**Media Constraints:**
```typescript
{
  audio: true,
  video: false
}
```

### Redis Socket Tracking

**Key Format:** `user_socket:{userId}`
**Value:** Socket ID
**TTL:** 1 hour

**Operations:**
- Set on user connection
- Get when initiating call
- Delete on disconnection

### Audio Codec

WebRTC automatically negotiates the best audio codec:
- Opus (preferred) - 48kHz, low latency
- G.722 - Wideband audio
- PCMU/PCMA - Fallback options

### Bandwidth Usage

- **Audio only:** ~50-100 Kbps per direction
- **Total for call:** ~100-200 Kbps
- **Latency:** <100ms for P2P connection

## Security & Privacy

✅ **End-to-end encryption** - WebRTC uses DTLS-SRTP
✅ **No server recording** - Audio streams P2P, not through server
✅ **Explicit permissions** - User must grant microphone access
✅ **Secure signaling** - Socket.io over HTTPS (in production)
✅ **No persistent storage** - No call data stored

## Future Enhancements

Possible improvements:
1. **Video calling** - Add camera stream
2. **Screen sharing** - For language practice materials
3. **Call recording** - Save practice sessions (with consent)
4. **Call quality indicators** - Show connection strength
5. **Background noise suppression** - Improve audio quality
6. **Echo cancellation** - Better audio processing
7. **Call history** - Track past calls
8. **Group calls** - Multiple users in one call
9. **TURN server** - For restrictive networks

## Commands Reference

### Start Backend
```bash
cd backend
npm run dev
```

### Start Frontend
```bash
cd my-first-mini-app
npm run dev
```

### Check Redis
```bash
redis-cli KEYS user_socket:*
```

### Test Backend Health
```bash
curl http://localhost:4000/health
```

### View Backend Logs
Look for these in the terminal:
- `📞 Call initiated`
- `✓ Call accepted`
- `📡 WebRTC offer sent`
- `📡 WebRTC answer sent`
- `🧊 ICE candidate sent`
- `📴 Call ended`

## Support

If you encounter issues:
1. Check browser console for errors
2. Check backend terminal logs
3. Verify Redis is running
4. Test with different browsers
5. Try on different network (mobile data vs WiFi)

## Browser Compatibility

✅ **Chrome/Edge** - Full support
✅ **Firefox** - Full support
✅ **Safari** - Full support (iOS 11+)
✅ **Mobile browsers** - Full support (HTTPS required)

**Note:** WebRTC requires a secure context (HTTPS or localhost)

