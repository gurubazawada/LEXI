import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { matchingService } from '../services/matching.service.js';
import { queueService } from '../services/queue.service.js';
import { socketTrackingService } from '../services/socket-tracking.service.js';
import { redisClient } from '../config/redis.js';
import { UserData } from '../types/index.js';
import { Server } from 'socket.io';

// Mock console.log
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
} as any;

describe('MatchingService Integration Tests', () => {
  const learner: UserData = {
    id: 'test-learner',
    username: 'Learner',
    role: 'learner',
    language: 'es',
    timestamp: Date.now(),
  };

  const fluent: UserData = {
    id: 'test-fluent',
    username: 'Fluent',
    role: 'fluent',
    language: 'es',
    timestamp: Date.now(),
  };

  const mockIo = {} as Server;

  beforeAll(async () => {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  }, 10000);

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(async () => {
    await queueService.removeUserFromAnyQueue(learner.id);
    await queueService.removeUserFromAnyQueue(fluent.id);
    await matchingService.removeMatch(learner.id);
    await matchingService.removeMatch(fluent.id);
    
    // Restore mocks
    jest.restoreAllMocks();
  });

  it('should match a learner with a fluent speaker', async () => {
    // 1. Add fluent speaker to queue
    await queueService.joinQueue(fluent);
    
    // 2. Mock socket tracking to return valid socket and successful ping
    jest.spyOn(socketTrackingService, 'getUserSocket').mockResolvedValue('socket-id-fluent');
    jest.spyOn(socketTrackingService, 'pingUser').mockResolvedValue(true);

    // 3. Learner tries to find match
    const match = await matchingService.findMatch(learner, mockIo);

    expect(match).toBeDefined();
    expect(match?.id).toBe(fluent.id);
    expect(match?.socketId).toBe('socket-id-fluent');

    // Verify match persistence
    const hasMatch = await matchingService.hasActiveMatch(learner.id);
    expect(hasMatch).toBe(true);
  });

  it('should skip unresponsive users (ping fail)', async () => {
    // 1. Add fluent speaker to queue
    await queueService.joinQueue(fluent);

    // 2. Mock socket tracking: socket exists but ping fails
    jest.spyOn(socketTrackingService, 'getUserSocket').mockResolvedValue('socket-id-fluent');
    jest.spyOn(socketTrackingService, 'pingUser').mockResolvedValue(false); // Ping timeout

    // 3. Learner tries to find match
    const match = await matchingService.findMatch(learner, mockIo);

    // Should return null because fluent user was unresponsive
    expect(match).toBeNull();

    // Fluent user should be removed from queue (cleanup)
    const inQueue = await queueService.isUserInQueue(fluent.id);
    expect(inQueue).toBe(false);
  });

  it('should skip offline users (no socket)', async () => {
    await queueService.joinQueue(fluent);

    // Mock no socket found
    jest.spyOn(socketTrackingService, 'getUserSocket').mockResolvedValue(null);

    const match = await matchingService.findMatch(learner, mockIo);

    expect(match).toBeNull();
  });
});

