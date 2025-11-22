import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { connectRedis, disconnectRedis, redisClient } from './config/redis.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { enableNotificationsForUser, disableNotificationsForUser, hasNotificationsEnabled, sendDailyNotifications } from './services/notification.service.js';

// Load environment variables from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Log environment variable status (without exposing sensitive values)
console.log('📋 Environment variables loaded:');
console.log(`   WORLDCOIN_APP_ID: ${process.env.WORLDCOIN_APP_ID ? '✓ Set' : '✗ Not set'}`);
console.log(`   WORLDCOIN_API_KEY: ${process.env.WORLDCOIN_API_KEY ? '✓ Set' : '✗ Not set'}`);
console.log(`   MINI_APP_PATH: ${process.env.MINI_APP_PATH ? '✓ Set' : '✗ Not set'}`);

const app = express();
const httpServer = createServer(app);

// Configure CORS - allow all origins
const corsOrigin = process.env.CORS_ORIGIN || 'not set';
console.log('🌐 CORS_ORIGIN environment variable:', corsOrigin);
console.log('🌐 CORS configured to allow: * (all origins)');

app.use(cors({
  origin: '*', // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path} from ${req.get('origin') || 'no origin'}`);
  next();
});

// Socket.io setup with CORS - allow all origins
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'LEX Matching Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      socket: 'ws://localhost:4000',
    },
  });
});

// Notification endpoints
app.post('/api/notifications/enable', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing walletAddress' });
    }

    // Validate wallet address format (basic check)
    if (typeof walletAddress !== 'string' || walletAddress.length < 10) {
      return res.status(400).json({ error: 'Invalid walletAddress format' });
    }

    const saved = await enableNotificationsForUser(walletAddress);
    
    if (saved) {
      // Verify it was saved by checking the database
      const isEnabled = await hasNotificationsEnabled(walletAddress);
      if (isEnabled) {
        res.json({ 
          success: true, 
          message: 'Notifications enabled and saved to database',
          walletAddress,
          enabled: true
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to verify notification preference was saved',
          walletAddress 
        });
      }
    } else {
      res.status(500).json({ 
        error: 'Failed to save notification preference',
        walletAddress 
      });
    }
  } catch (error) {
    console.error('Error enabling notifications:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/notifications/disable', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing walletAddress' });
    }

    // Validate wallet address format (basic check)
    if (typeof walletAddress !== 'string' || walletAddress.length < 10) {
      return res.status(400).json({ error: 'Invalid walletAddress format' });
    }

    const removed = await disableNotificationsForUser(walletAddress);
    
    if (removed) {
      // Verify it was removed by checking the database
      const isEnabled = await hasNotificationsEnabled(walletAddress);
      if (!isEnabled) {
        res.json({ 
          success: true, 
          message: 'Notifications disabled and saved to database',
          walletAddress,
          enabled: false
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to verify notification preference was removed',
          walletAddress 
        });
      }
    } else {
      res.status(500).json({ 
        error: 'Failed to remove notification preference',
        walletAddress 
      });
    }
  } catch (error) {
    console.error('Error disabling notifications:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/notifications/status/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const enabled = await hasNotificationsEnabled(walletAddress);
    res.json({ enabled });
  } catch (error) {
    console.error('Error checking notification status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual trigger for sending notifications
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { title, message, miniAppPath, appId: bodyAppId, apiKey: bodyApiKey } = req.body;
    
    // Allow appId and apiKey to be passed in request body, fallback to env vars
    const appId = bodyAppId || process.env.WORLDCOIN_APP_ID || '';
    const apiKey = bodyApiKey || process.env.WORLDCOIN_API_KEY;
    const defaultMiniAppPath = process.env.MINI_APP_PATH || `worldapp://mini-app?app_id=${appId}`;

    if (!appId) {
      return res.status(400).json({ error: 'WORLDCOIN_APP_ID not configured. Provide it in request body as "appId" or set WORLDCOIN_APP_ID environment variable.' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'WORLDCOIN_API_KEY is required. Provide it in request body as "apiKey" or set WORLDCOIN_API_KEY environment variable.' });
    }

    // Use provided values or defaults
    const finalTitle = title || '🌍 Daily Language Practice';
    const finalMessage = message || 'Hello ${username}! Ready for some language practice today? Find a partner and start chatting!';
    const finalPath = miniAppPath || defaultMiniAppPath;

    console.log('📧 Manual notification trigger requested');
    
    const result = await sendDailyNotifications(appId, finalPath, apiKey, finalTitle, finalMessage);

    const successCount = result.result.filter(r => r.sent).length;
    const failureCount = result.result.length - successCount;

    res.json({
      success: result.success,
      message: `Notifications sent: ${successCount} successful, ${failureCount} failed`,
      totalUsers: result.result.length,
      successful: successCount,
      failed: failureCount,
      results: result.result,
    });
  } catch (error) {
    console.error('Error manually triggering notifications:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log(`🔌 New Socket.io connection attempt from: ${socket.handshake.headers.origin || 'unknown origin'}`);
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.conn.transport.name}`);
});

io.engine.on('connection_error', (err) => {
  console.error('❌ Socket.io connection error:', err);
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// Server configuration
const PORT = process.env.PORT || 4000;

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log('\n⚠ Shutting down gracefully...');
  
  // Close Socket.io connections
  io.close(() => {
    console.log('✓ Socket.io connections closed');
  });
  
  // Disconnect from Redis
  await disconnectRedis();
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('✓ HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function startServer() {
  try {
    // Connect to Redis first
    await connectRedis();
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io listening for connections`);
      console.log(`🌐 CORS enabled for: * (all origins)`);
      console.log(`\n✓ Ready to accept connections\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

