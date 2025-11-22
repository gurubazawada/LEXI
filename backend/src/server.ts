import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { setupSocketHandlers } from './socket/handlers.js';

// Load environment variables
dotenv.config();

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

