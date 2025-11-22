import { redisClient } from '../config/redis.js';

const PROMPTS_KEY_PREFIX = 'prompts:';

/**
 * Get a random conversation prompt for a given language
 * @param language - Language code (e.g., 'es', 'en', 'fr')
 * @returns A random prompt string or null if no prompts found
 */
export async function getRandomPrompt(language: string): Promise<string | null> {
  try {
    const key = `${PROMPTS_KEY_PREFIX}${language}`;
    
    // Get the total number of prompts for this language
    const count = await redisClient.lLen(key);
    
    if (count === 0) {
      console.warn(`No prompts found for language: ${language}`);
      return null;
    }
    
    // Get a random index
    const randomIndex = Math.floor(Math.random() * count);
    
    // Get the prompt at that index
    const prompt = await redisClient.lIndex(key, randomIndex);
    
    return prompt;
  } catch (error) {
    console.error(`Error getting random prompt for language ${language}:`, error);
    return null;
  }
}

/**
 * Get all prompts for a given language
 * @param language - Language code
 * @returns Array of prompt strings
 */
export async function getPrompts(language: string): Promise<string[]> {
  try {
    const key = `${PROMPTS_KEY_PREFIX}${language}`;
    const prompts = await redisClient.lRange(key, 0, -1);
    return prompts;
  } catch (error) {
    console.error(`Error getting prompts for language ${language}:`, error);
    return [];
  }
}

/**
 * Add a prompt to a language's prompt list
 * @param language - Language code
 * @param prompt - Prompt text
 */
export async function addPrompt(language: string, prompt: string): Promise<void> {
  try {
    const key = `${PROMPTS_KEY_PREFIX}${language}`;
    await redisClient.lPush(key, prompt);
  } catch (error) {
    console.error(`Error adding prompt for language ${language}:`, error);
    throw error;
  }
}

/**
 * Get the count of prompts for a language
 * @param language - Language code
 * @returns Number of prompts
 */
export async function getPromptCount(language: string): Promise<number> {
  try {
    const key = `${PROMPTS_KEY_PREFIX}${language}`;
    return await redisClient.lLen(key);
  } catch (error) {
    console.error(`Error getting prompt count for language ${language}:`, error);
    return 0;
  }
}

