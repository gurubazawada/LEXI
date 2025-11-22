import { redisClient } from '../config/redis.js';

const WORLDCOIN_API_URL = 'https://developer.worldcoin.org/api/v2/minikit/send-notification';
const NOTIFICATIONS_ENABLED_KEY = 'notifications:enabled';
const MAX_BATCH_SIZE = 1000; // Max users per API call

export interface SendNotificationRequest {
  wallet_addresses: string[];
  title: string;
  message: string;
  mini_app_path: string;
  app_id: string;
}

export interface SendNotificationResultItem {
  walletAddress: string;
  sent: boolean;
  reason?: string;
}

export interface SendNotificationResponse {
  success: boolean;
  status: number;
  result: SendNotificationResultItem[];
}

/**
 * Get all users who have notifications enabled
 */
export async function getUsersWithNotificationsEnabled(): Promise<string[]> {
  try {
    const users = await redisClient.sMembers(NOTIFICATIONS_ENABLED_KEY);
    return users;
  } catch (error) {
    console.error('Error getting users with notifications enabled:', error);
    return [];
  }
}

/**
 * Add a user to the notifications enabled list
 */
export async function enableNotificationsForUser(walletAddress: string): Promise<void> {
  try {
    await redisClient.sAdd(NOTIFICATIONS_ENABLED_KEY, walletAddress);
    console.log(`✓ Notifications enabled for user: ${walletAddress}`);
  } catch (error) {
    console.error('Error enabling notifications for user:', error);
    throw error;
  }
}

/**
 * Remove a user from the notifications enabled list
 */
export async function disableNotificationsForUser(walletAddress: string): Promise<void> {
  try {
    await redisClient.sRem(NOTIFICATIONS_ENABLED_KEY, walletAddress);
    console.log(`✓ Notifications disabled for user: ${walletAddress}`);
  } catch (error) {
    console.error('Error disabling notifications for user:', error);
    throw error;
  }
}

/**
 * Check if a user has notifications enabled
 */
export async function hasNotificationsEnabled(walletAddress: string): Promise<boolean> {
  try {
    const isMember = await redisClient.sIsMember(NOTIFICATIONS_ENABLED_KEY, walletAddress);
    return isMember;
  } catch (error) {
    console.error('Error checking notification status:', error);
    return false;
  }
}

/**
 * Send notifications to users via Worldcoin API
 */
export async function sendNotifications(
  walletAddresses: string[],
  title: string,
  message: string,
  miniAppPath: string,
  appId: string,
  apiKey?: string
): Promise<SendNotificationResponse> {
  // Split into batches of max 1000 users
  const batches: string[][] = [];
  for (let i = 0; i < walletAddresses.length; i += MAX_BATCH_SIZE) {
    batches.push(walletAddresses.slice(i, i + MAX_BATCH_SIZE));
  }

  const allResults: SendNotificationResultItem[] = [];

  for (const batch of batches) {
    const requestBody: SendNotificationRequest = {
      wallet_addresses: batch,
      title,
      message,
      mini_app_path: miniAppPath,
      app_id: appId,
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if provided
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(WORLDCOIN_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to send notifications: ${response.status} - ${errorText}`);
        
        // Add failed results for this batch
        batch.forEach(address => {
          allResults.push({
            walletAddress: address,
            sent: false,
            reason: `API error: ${response.status}`,
          });
        });
        continue;
      }

      const data: SendNotificationResponse = await response.json();
      
      if (data.result) {
        allResults.push(...data.result);
      }
    } catch (error) {
      console.error('Error sending notification batch:', error);
      
      // Add failed results for this batch
      batch.forEach(address => {
        allResults.push({
          walletAddress: address,
          sent: false,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }
  }

  const successCount = allResults.filter(r => r.sent).length;
  const failureCount = allResults.length - successCount;

  console.log(`📧 Notification send complete: ${successCount} sent, ${failureCount} failed`);

  return {
    success: failureCount === 0,
    status: 200,
    result: allResults,
  };
}

/**
 * Send daily notification to all users with notifications enabled
 */
export async function sendDailyNotifications(
  appId: string,
  miniAppPath: string,
  apiKey?: string,
  customTitle?: string,
  customMessage?: string
): Promise<SendNotificationResponse> {
  const users = await getUsersWithNotificationsEnabled();

  if (users.length === 0) {
    console.log('📧 No users with notifications enabled');
    return {
      success: true,
      status: 200,
      result: [],
    };
  }

  console.log(`📧 Sending notifications to ${users.length} users`);

  const title = customTitle || '🌍 Daily Language Practice';
  const message = customMessage || 'Hello ${username}! Ready for some language practice today? Find a partner and start chatting!';

  return await sendNotifications(
    users,
    title,
    message,
    miniAppPath,
    appId,
    apiKey
  );
}

