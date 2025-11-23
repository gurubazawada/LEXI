import { redisClient } from '../config/redis.js';
import { supportedLanguages, type LanguageCode } from '../data/promptSeeds.js';

const PROMPTS_KEY_PREFIX = 'prompts:';

/**
 * Validate if a language is supported
 */
function isSupportedLanguage(language: string): language is LanguageCode {
  return supportedLanguages.includes(language as LanguageCode);
}

/**
 * Get a random conversation prompt for a given language
 * @param language - Language code (e.g., 'es', 'en', 'fr')
 * @returns A random prompt string or null if no prompts found or language not supported
 */
export async function getRandomPrompt(language: string): Promise<string | null> {
  try {
    // Validate language is supported - no default fallback
    if (!isSupportedLanguage(language)) {
      console.warn(`Unsupported language requested: ${language}. Supported languages: ${supportedLanguages.join(', ')}`);
      return null;
    }
    
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
 * @returns Array of prompt strings (empty array if language not supported or error)
 */
export async function getPrompts(language: string): Promise<string[]> {
  try {
    // Validate language is supported - no default fallback
    if (!isSupportedLanguage(language)) {
      console.warn(`Unsupported language requested: ${language}. Supported languages: ${supportedLanguages.join(', ')}`);
      return [];
    }
    
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
 * @param language - Language code (must be supported)
 * @param prompt - Prompt text
 */
export async function addPrompt(language: string, prompt: string): Promise<void> {
  try {
    // Validate language is supported
    if (!isSupportedLanguage(language)) {
      throw new Error(`Unsupported language: ${language}. Supported languages: ${supportedLanguages.join(', ')}`);
    }
    
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
 * @returns Number of prompts (0 if language not supported or error)
 */
export async function getPromptCount(language: string): Promise<number> {
  try {
    // Validate language is supported
    if (!isSupportedLanguage(language)) {
      console.warn(`Unsupported language requested: ${language}. Supported languages: ${supportedLanguages.join(', ')}`);
      return 0;
    }
    
    const key = `${PROMPTS_KEY_PREFIX}${language}`;
    return await redisClient.lLen(key);
  } catch (error) {
    console.error(`Error getting prompt count for language ${language}:`, error);
    return 0;
  }
}

