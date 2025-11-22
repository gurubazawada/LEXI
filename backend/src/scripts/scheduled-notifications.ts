import dotenv from 'dotenv';
import cron from 'node-cron';
import { connectRedis, disconnectRedis } from '../config/redis.js';
import { sendDailyNotifications } from '../services/notification.service.js';

dotenv.config();

const APP_ID = process.env.WORLDCOIN_APP_ID || '';
const MINI_APP_PATH = process.env.MINI_APP_PATH || 'worldapp://mini-app?app_id=' + APP_ID;
const WORLDCOIN_API_KEY = process.env.WORLDCOIN_API_KEY; // Optional API key if required

/**
 * Schedule daily notifications at 10 AM
 * Cron format: minute hour day month dayOfWeek
 * '0 10 * * *' = Every day at 10:00 AM
 */
async function scheduleDailyNotifications() {
  await connectRedis();

  // Schedule for 10 AM every day
  cron.schedule('0 10 * * *', async () => {
    console.log(`\n📅 Running scheduled daily notifications at ${new Date().toISOString()}`);
    
    try {
      const result = await sendDailyNotifications(APP_ID, MINI_APP_PATH, WORLDCOIN_API_KEY);
      
      if (result.success) {
        console.log(`✓ Daily notifications sent successfully to ${result.result.filter(r => r.sent).length} users`);
      } else {
        console.error(`✗ Some notifications failed: ${result.result.filter(r => !r.sent).length} failed`);
      }
    } catch (error) {
      console.error('Error in scheduled notification job:', error);
    }
  });

  console.log('📅 Scheduled daily notifications: Every day at 10:00 AM');
  console.log('   App ID:', APP_ID);
  console.log('   Mini App Path:', MINI_APP_PATH);
  console.log('   Waiting for scheduled time...\n');
}

// Run immediately on startup (for testing)
// Uncomment the line below to test immediately
// sendDailyNotifications(APP_ID, MINI_APP_PATH, WORLDCOIN_API_KEY).catch(console.error);

// Start the scheduler
scheduleDailyNotifications().catch((error) => {
  console.error('Failed to start notification scheduler:', error);
  process.exit(1);
});

// Keep the process alive
process.on('SIGINT', async () => {
  console.log('\n⚠ Shutting down notification scheduler...');
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠ Shutting down notification scheduler...');
  await disconnectRedis();
  process.exit(0);
});

