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

// Configure CORS - allow multiple origins for development
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://unobsequiously-unruffled-jesse.ngrok-free.dev'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (corsOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      // For development, allow all localhost origins and ngrok domains
      if (origin.includes('localhost') || 
          origin.includes('127.0.0.1') || 
          origin.includes('ngrok-free.dev') ||
          origin.includes('ngrok.io')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Socket.io setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (corsOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        // For development, allow all localhost origins and ngrok domains
        if (origin.includes('localhost') || 
            origin.includes('127.0.0.1') || 
            origin.includes('ngrok-free.dev') ||
            origin.includes('ngrok.io')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
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
      console.log(`🌐 CORS enabled for: ${corsOrigins.join(', ')}`);
      console.log(`\n✓ Ready to accept connections\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

