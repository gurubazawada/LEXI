import dotenv from 'dotenv';
import { connectRedis, disconnectRedis, redisClient } from '../config/redis.js';
import { promptSeeds, supportedLanguages } from '../data/promptSeeds.js';

dotenv.config();

const PROMPTS_KEY_PREFIX = 'prompts:';
const EXPECTED_PROMPTS = 100;

async function seedPrompts() {
  await connectRedis();

  try {
    for (const language of supportedLanguages) {
      const prompts = promptSeeds[language] ?? [];
      const key = `${PROMPTS_KEY_PREFIX}${language}`;

      await redisClient.del(key);

      if (prompts.length) {
        await redisClient.rPush(key, prompts);
      }

      const count = await redisClient.lLen(key);
      const countNote = count === EXPECTED_PROMPTS ? '' : ` (expected ${EXPECTED_PROMPTS})`;
      console.log(`Seeded ${count} prompts for ${language}${countNote}`);
    }
  } finally {
    await disconnectRedis();
  }
}

seedPrompts().catch((error) => {
  console.error('Failed to seed prompts', error);
  process.exit(1);
});
