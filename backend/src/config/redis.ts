import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✓ Connected to Redis');
});

redisClient.on('reconnecting', () => {
  console.log('⟳ Reconnecting to Redis...');
});

export async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
}

export async function disconnectRedis() {
  try {
    await redisClient.quit();
    console.log('✓ Disconnected from Redis');
  } catch (error) {
    console.error('Error disconnecting from Redis:', error);
  }
}

