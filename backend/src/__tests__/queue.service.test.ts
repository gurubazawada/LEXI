import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { queueService } from '../services/queue.service.js';
import { redisClient } from '../config/redis.js';
import { UserData } from '../types/index.js';

// Mock console.log to keep output clean
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
} as any;

describe('QueueService Integration Tests', () => {
  const testUser1: UserData = {
    id: 'test-user-1',
    username: 'TestUser1',
    role: 'learner',
    language: 'es',
    timestamp: Date.now(),
  };

  const testUser2: UserData = {
    id: 'test-user-2',
    username: 'TestUser2',
    role: 'learner',
    language: 'fr',
    timestamp: Date.now(),
  };

  beforeAll(async () => {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  }, 10000); // 10s timeout for connection

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await queueService.removeUserFromAnyQueue(testUser1.id);
    await queueService.removeUserFromAnyQueue(testUser2.id);
  });

  it('should add a user to the queue', async () => {
    await queueService.joinQueue(testUser1);

    const size = await queueService.getQueueSize('learner', 'es');
    expect(size).toBeGreaterThan(0);

    const inQueue = await queueService.isUserInQueue(testUser1.id);
    expect(inQueue).toBe(true);
  });

  it('should enforce strict queue separation (switching languages)', async () => {
    // 1. Join Spanish queue
    await queueService.joinQueue(testUser1);
    
    // Verify in Spanish queue
    const esSize = await queueService.getQueueSize('learner', 'es');
    const frSizeBefore = await queueService.getQueueSize('learner', 'fr');
    
    // 2. Switch to French queue (joinQueue handles removal)
    const testUser1French = { ...testUser1, language: 'fr' };
    await queueService.joinQueue(testUser1French);

    // 3. Verify REMOVED from Spanish queue
    // Note: Since we don't know if other tests/users are running, we verify our specific user is gone
    // But checking size decrement is a good proxy if we assume isolated env
    // Better: Check user:queue mapping
    const mapping = await redisClient.get(`user:queue:${testUser1.id}`);
    expect(mapping).toBe('learner:fr');

    // Verify ADDED to French queue
    const frSizeAfter = await queueService.getQueueSize('learner', 'fr');
    expect(frSizeAfter).toBeGreaterThan(frSizeBefore);
  });

  it('should remove user from any queue on disconnect', async () => {
    await queueService.joinQueue(testUser1);
    
    await queueService.removeUserFromAnyQueue(testUser1.id);
    
    const inQueue = await queueService.isUserInQueue(testUser1.id);
    expect(inQueue).toBe(false);
    
    const mapping = await redisClient.get(`user:queue:${testUser1.id}`);
    expect(mapping).toBeNull();
  });

  it('should retrieve and remove user via getNextFromQueue', async () => {
    await queueService.joinQueue(testUser1);
    
    const user = await queueService.getNextFromQueue('learner', 'es');
    
    expect(user).toBeDefined();
    if (user) {
      expect(user.id).toBe(testUser1.id);
    }
    
    // Verify cleanup
    const inQueue = await queueService.isUserInQueue(testUser1.id);
    expect(inQueue).toBe(false);
    
    const mapping = await redisClient.get(`user:queue:${testUser1.id}`);
    expect(mapping).toBeNull();
  });
});

